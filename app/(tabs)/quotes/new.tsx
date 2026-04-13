import React, {useState} from 'react';
import {View, Text, TextInput, TouchableOpacity, ScrollView, Alert} from 'react-native';
import {useRouter} from 'expo-router';
import {Camera, Plus, Trash2} from 'lucide-react-native';
import {useQuote} from "@/context/quote-context";
import {Image} from "expo-image";
import * as ImagePicker from 'expo-image-picker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import {supabase} from "@/lib/supabase";
import {uploadQuotePhoto} from "@/lib/upload-photo";

export default function NewQuote() {
    const router = useRouter();
    const {lineItems, addLineItem, removeLineItem, updateLineItem, clearLineItems} = useQuote();

    const [clientName, setClientName] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [notes, setNotes] = useState('');

    React.useEffect(() => {
        (async () => {
            const {status} = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission needed', 'Camera access is required to take before photos.');
            }
        })();
    }, []);

    const total = lineItems.reduce((sum, item) =>
        sum + (item.quantity * item.unitPrice), 0
    );

    const saveQuote = () => {
        if (!clientName.trim()) {
            Alert.alert('Error', 'Client name is required');
            return;
        }
        if (lineItems.length === 0) {
            Alert.alert('Error', 'Add at least one line item');
            return;
        }

        Alert.alert(
            'Quote Ready!',
            `Client: ${clientName}\nTotal: $${total}\n\n(Supabase save coming soon)`,
            [{
                text: 'OK', onPress: () => {
                    clearLineItems();
                    router.back();
                }
            }]
        );
    };

    const saveToSupabase = async () => {
        if (!clientName.trim() || lineItems.length === 0) {
            Alert.alert('Error', 'Client name and at least one item required');
            return;
        }

        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                Alert.alert('Not logged in');
                return;
            }
            // 1. Create the Quote
            const { data: quote, error: quoteError } = await supabase
                .from('quotes')
                .insert({
                    handyman_id: user.id,
                    client_name: clientName,
                    client_phone: clientPhone,
                    notes: notes,
                    total_amount: total,
                    status: 'draft',
                })
                .select()
                .single();

            if (quoteError) throw quoteError;

            // 2. Upload photos + Save Line Items
            for (const item of lineItems) {
                let photoUrl = null;
                if (item.photoUri) {
                    photoUrl = await uploadQuotePhoto(item.photoUri, quote.id);
                }

                await supabase.from('quote_line_items').insert({
                    quote_id: quote.id,
                    description: item.description,
                    quantity: item.quantity,
                    unit_price: item.unitPrice,
                    is_labor: item.isLabor,
                    photo_url: photoUrl,
                });
            }

            Alert.alert('Success!', 'Quote saved to database.\nYou can now generate PDF or view in Quotes list.');

            // Clear form and go back
            clearLineItems();
            router.back();

        } catch (error: any) {
            console.error(error);
            Alert.alert('Save Failed', error.message || 'Please try again');
        }
    };

    const generateAndSharePDF = async () => {
        if (!clientName.trim()) {
            Alert.alert('Missing Info', 'Please enter client name');
            return;
        }
        if (lineItems.length === 0) {
            Alert.alert('No Items', 'Add at least one line item');
            return;
        }

        // Build nice HTML for the PDF
        const htmlContent = `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; line-height: 1.6; }
          h1 { color: #1e40af; text-align: center; }
          .header { text-align: center; margin-bottom: 30px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          th { background-color: #f1f5f9; }
          .total { font-size: 24px; font-weight: bold; color: #15803d; text-align: right; margin-top: 20px; }
          .photo { max-width: 300px; margin: 10px 0; border-radius: 8px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>FixBid Handyman Quote</h1>
          <p><strong>Cliford Dareus</strong> • Professional Handyman • Miramar, FL</p>
          <p>Date: ${new Date().toLocaleDateString()}</p>
        </div>

        <h2>Client: ${clientName}</h2>
        ${clientPhone ? `<p>Phone: ${clientPhone}</p>` : ''}

        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th>Qty</th>
              <th>Unit Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${lineItems.map(item => `
              <tr>
                <td>${item.description}</td>
                <td>${item.quantity}</td>
                <td>$${item.unitPrice}</td>
                <td>$${(item.quantity * item.unitPrice).toFixed(2)}</td>
              </tr>
              ${item.photoUri ? `
                <tr>
                  <td colspan="4">
                    <img src="${item.photoUri}" class="photo" alt="Before photo" />
                  </td>
                </tr>
              ` : ''}
            `).join('')}
          </tbody>
        </table>

        <div class="total">Total: $${total}</div>

        ${notes ? `<p><strong>Notes:</strong><br>${notes.replace(/\n/g, '<br>')}</p>` : ''}

        <p style="margin-top: 50px; text-align: center; color: #666;">
          Thank you for your business!<br>
          Call or text Cliford at any time for questions.
        </p>
      </body>
    </html>
  `;

        try {
            // Generate PDF file
            const {uri} = await Print.printToFileAsync({
                html: htmlContent,
                base64: false,
            });

            // Share it immediately
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri, {
                    mimeType: 'application/pdf',
                    dialogTitle: `Quote for ${clientName}`,
                    UTI: 'com.adobe.pdf',
                });

                Alert.alert('Success!', 'PDF generated and share sheet opened.\n\nYou can now send it via text, email, or WhatsApp.');
            } else {
                Alert.alert('Sharing not available', 'PDF saved to cache but cannot share on this device.');
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to generate PDF. Please try again.');
        }
    };

    return (
        <View className="flex-1 bg-gray-50">
            <ScrollView className="flex-1">
                <View className="bg-blue-600 px-6 py-8">
                    <Text className="text-white text-3xl font-bold">New Quote</Text>
                </View>

                {/* Client Info */}
                <View className="px-6 pt-6">
                    <Text className="text-lg font-semibold mb-4">Client Information</Text>
                    <TextInput
                        className="bg-white border border-gray-300 rounded-2xl px-5 py-4 mb-3 text-lg"
                        placeholder="Client Name"
                        value={clientName}
                        onChangeText={setClientName}
                    />
                    <TextInput
                        className="bg-white border border-gray-300 rounded-2xl px-5 py-4 text-lg"
                        placeholder="Phone Number"
                        value={clientPhone}
                        onChangeText={setClientPhone}
                        keyboardType="phone-pad"
                    />
                </View>

                {/* Line Items Section */}
                <View className="px-6 pt-8">
                    <View className="flex-row justify-between mb-4">
                        <Text className="text-lg font-semibold">Line Items</Text>
                        <TouchableOpacity onPress={() => {
                            addLineItem({description: '', quantity: 1, unitPrice: 0, isLabor: true});
                        }} className="bg-green-100 p-2 rounded-xl">
                            <Plus size={24} color="#15803d"/>
                        </TouchableOpacity>
                    </View>

                    {lineItems.map((item, index) => (
                        <View key={item.id} className="bg-white p-5 rounded-3xl mb-4">

                            <View className="flex-row justify-between">
                                <Text className="font-medium">Item #{index + 1}</Text>
                                <TouchableOpacity onPress={() => removeLineItem(item.id)}>
                                    <Trash2 size={20} color="#ef4444"/>
                                </TouchableOpacity>
                            </View>

                            {/* Photo Section */}
                            <TouchableOpacity
                                onPress={async () => {
                                    // We'll add the actual picker function below
                                    const result = await ImagePicker.launchCameraAsync({
                                        allowsEditing: true,
                                        quality: 0.7,
                                        aspect: [4, 3],
                                    });

                                    if (!result.canceled && result.assets && result.assets[0]) {
                                        updateLineItem(item.id, {photoUri: result.assets[0].uri});
                                    }
                                }}
                                className="mt-4 h-48 bg-gray-100 rounded-2xl overflow-hidden border border-dashed border-gray-400 flex items-center justify-center"
                            >
                                {item.photoUri ? (
                                    <Image
                                        source={{uri: item.photoUri}}
                                        className="w-full h-full"
                                        resizeMode="cover"
                                    />
                                ) : (
                                    <View className="items-center">
                                        <Camera size={40} color="#6b7280"/>
                                        <Text className="text-gray-500 mt-2 text-sm">Tap to take Before Photo</Text>
                                    </View>
                                )}
                            </TouchableOpacity>

                            <TextInput
                                className="border border-gray-300 rounded-xl px-4 py-3 mt-3"
                                placeholder="Description"
                                value={item.description}
                                onChangeText={(text) => updateLineItem(item.id, {description: text})}
                            />

                            <View className="flex-row gap-3 mt-3">
                                <View className="flex-1">
                                    <Text className="text-xs text-gray-500 mb-1">QTY</Text>
                                    <TextInput
                                        className="bg-gray-100 rounded-xl px-4 py-3 text-center"
                                        value={item.quantity.toString()}
                                        onChangeText={(text) => updateLineItem(item.id, {quantity: parseInt(text) || 1})}
                                        keyboardType="numeric"
                                    />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-xs text-gray-500 mb-1">UNIT PRICE</Text>
                                    <TextInput
                                        className="bg-gray-100 rounded-xl px-4 py-3"
                                        value={item.unitPrice.toString()}
                                        onChangeText={(text) => updateLineItem(item.id, {unitPrice: parseFloat(text) || 0})}
                                        keyboardType="decimal-pad"
                                    />
                                </View>
                            </View>
                        </View>
                    ))}
                </View>

                <View className="px-6 pt-4 pb-20">
                    <Text className="text-lg font-semibold mb-3">Notes</Text>
                    <TextInput
                        className="bg-white border border-gray-300 rounded-3xl px-5 py-4 h-32"
                        placeholder="Additional notes..."
                        value={notes}
                        onChangeText={setNotes}
                        multiline
                    />
                </View>
            </ScrollView>

            {/* Bottom Bar with PDF Generate + Share */}
            <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-5">
                <View className="flex-row justify-between items-center mb-4">
                    <View>
                        <Text className="text-gray-500 text-sm">Total Estimate</Text>
                        <Text className="text-4xl font-bold text-green-600">${total}</Text>
                    </View>

                    <TouchableOpacity
                        onPress={generateAndSharePDF}
                        disabled={lineItems.length === 0 || !clientName.trim()}
                        className={`px-8 py-4 rounded-2xl flex-row items-center gap-2 ${lineItems.length === 0 || !clientName.trim() ? 'bg-gray-400' : 'bg-blue-600 active:bg-blue-700'}`}
                    >
                        <Text className="text-white font-semibold text-xl">Generate & Share PDF</Text>
                    </TouchableOpacity>
                </View>
                    <TouchableOpacity
                        onPress={saveToSupabase}
                        disabled={lineItems.length === 0 || !clientName.trim()}
                        className={`px-8 py-4 rounded-2xl flex-row items-center gap-2 ${lineItems.length === 0 || !clientName.trim() ? 'bg-gray-400' : 'bg-blue-600 active:bg-blue-700'}`}
                    >
                        <Text className="text-white text-center font-semibold text-xl">Save to Database</Text>
                    </TouchableOpacity>

                {/* Optional: Keep a simple Save Draft button if you want */}
                <TouchableOpacity
                    onPress={saveQuote}
                    className="border border-gray-300 py-3 rounded-2xl"
                >
                    <Text className="text-center text-gray-700 font-medium">Save as Draft Only</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}