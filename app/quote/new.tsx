import React, {useState} from 'react';
import {View, Text, TextInput, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform, ActivityIndicator} from 'react-native';
import {useRouter} from 'expo-router';
import {useQuote} from '@/context/quote-context';
import {useAuth} from '@/context/auth-context';
import {Image} from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import {quotesApi} from '@/lib/data';
import {uploadPhotoFromUri} from '@/lib/upload-photo';
import {Feather} from '@expo/vector-icons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {calculateJobCost, JOB_TEMPLATES} from '@/data/templates';
import useThemedNavigation from '@/hooks/use-navigation-theme';
import {useProfile} from '@/context/profile-context';

export default function NewQuote() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const {user} = useAuth();
    const {
        newQuote,
        clients,
        lineItems,
        addNewQuote,
        updateNewQuote,
        clearNewQuote,
        removeLineItem,
        updateLineItem,
        addLineItem,
        setLineItems,
        fetchQuotes,
    } = useQuote();
    const {profile} = useProfile();
    const {colors} = useThemedNavigation();
    const [step, setStep] = useState<'photo' | 'details'>('photo');
    const [photos, setPhotos] = useState<string[]>([]);
    const [jobName, setJobName] = useState(newQuote?.job_name || '');
    const [notes, setNotes] = useState('');
    const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
    const [clientName, setClientName] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [saving, setSaving] = useState(false);

    React.useEffect(() => {
        (async () => {
            const {status} = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission needed', 'Camera access is required to take before photos.');
            }
        })();
    }, []);

    React.useEffect(() => {
        if (!selectedClientId) return;
        const client = clients.find((c) => c.id === selectedClientId);
        if (client) {
            setClientName(client.name || '');
            setClientPhone(client.phone || '');
        }
    }, [selectedClientId, clients]);

    const total = lineItems.reduce(
        (sum, item) => sum + (item?.quantity || 0) * (item?.unitPrice || 0),
        0,
    );

    const resolvedClientName = (() => {
        if (selectedClientId) {
            const client = clients.find((c) => c.id === selectedClientId);
            if (client?.name) return client.name;
        }
        return clientName.trim();
    })();

    const resolvedClientPhone = (() => {
        if (selectedClientId) {
            const client = clients.find((c) => c.id === selectedClientId);
            if (client?.phone) return client.phone;
        }
        return clientPhone.trim();
    })();

    const pickPhoto = async () => {
        if (Platform.OS !== 'web') {
            const {status} = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission needed', 'Allow photo access to upload job photos.');
                return;
            }
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsMultipleSelection: true,
            quality: 0.8,
        });
        if (!result.canceled) {
            const uris = result.assets.map((a) => a.uri);
            setPhotos((prev) => [...prev, ...uris].slice(0, 5));
        }
    };

    const takePhoto = async () => {
        if (Platform.OS !== 'web') {
            const {status} = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission needed', 'Allow camera access to take job photos.');
                return;
            }
            const result = await ImagePicker.launchCameraAsync({quality: 0.8});
            if (!result.canceled) {
                setPhotos((prev) => [...prev, result.assets[0].uri].slice(0, 5));
            }
        } else {
            Alert.alert('Camera not available on web', 'Use the upload button instead.');
        }
    };

    const handleSave = async () => {
        if (!resolvedClientName || lineItems.length === 0) {
            Alert.alert('Error', 'Client name and at least one line item are required');
            return;
        }

        const activeJobName = (newQuote?.job_name || jobName || '').trim();
        if (!activeJobName) {
            Alert.alert('Error', 'Job name is required');
            return;
        }

        if (!user?.id) {
            Alert.alert('Not logged in');
            return;
        }

        setSaving(true);
        try {
            const photoUrls = await Promise.all(
                photos.map((photoUri) => uploadPhotoFromUri(photoUri, user.id)),
            );

            const client = selectedClientId
                ? clients.find((c) => c.id === selectedClientId) ?? null
                : null;

            const linePayload = [];
            for (const item of lineItems) {
                let photoUrl: string | null = null;
                if (item.photoUri) {
                    try {
                        photoUrl = await uploadPhotoFromUri(item.photoUri, user.id);
                    } catch (uploadErr) {
                        console.warn('Line-item photo upload failed, continuing without it', uploadErr);
                    }
                }
                linePayload.push({
                    description: item.description,
                    quantity: item.quantity,
                    unit_price: item.unitPrice,
                    is_labor: item.isLabor ?? false,
                    photo_url: photoUrl,
                });
            }

            const result = await quotesApi.createQuote({
                handyman_id: user.id,
                client_name: resolvedClientName,
                client_phone: resolvedClientPhone || null,
                job_name: activeJobName,
                client_id: client?.id ?? null,
                notes: notes || null,
                photos: photoUrls,
                total_amount: total,
                status: 'draft',
                line_items: linePayload,
            });

            if (!result.ok) throw new Error(result.error);

            try {
                await fetchQuotes();
            } catch {
                // non-fatal
            }

            clearNewQuote();
            setPhotos([]);
            setNotes('');
            setSelectedClientId(null);
            setClientName('');
            setClientPhone('');

            Alert.alert('Success!', 'Quote saved. You can generate a PDF or view it in Quotes.');
            router.back();
        } catch (error: any) {
            console.error(error);
            Alert.alert('Save Failed', error.message || 'Please try again');
        } finally {
            setSaving(false);
        }
    };

    const generateAndSharePDF = async () => {
        if (!resolvedClientName) {
            Alert.alert('Missing Info', 'Please select or enter a client name');
            return;
        }
        if (lineItems.length === 0) {
            Alert.alert('No Items', 'Add at least one line item');
            return;
        }

        const businessName =
            profile?.business_name || profile?.full_name || 'Professional Handyman';
        const businessPhone = profile?.phone || '';
        const businessLocation = profile?.address || '';
        const activeJobName = (newQuote?.job_name || jobName || 'Quote').trim();

        const htmlContent = `
            <html>
              <head>
                <style>
                  body { font-family: Arial, sans-serif; padding: 40px; line-height: 1.6; color: #111; }
                  h1 { color: #1e40af; text-align: center; margin-bottom: 4px; }
                  .header { text-align: center; margin-bottom: 30px; }
                  .meta { color: #555; font-size: 14px; }
                  table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                  th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                  th { background-color: #f1f5f9; }
                  .total { font-size: 24px; font-weight: bold; color: #15803d; text-align: right; margin-top: 20px; }
                  .photo { max-width: 280px; margin: 8px 0; border-radius: 8px; }
                </style>
              </head>
              <body>
                <div class="header">
                  <h1>FixBid Quote</h1>
                  <p class="meta"><strong>${businessName}</strong>${businessLocation ? ` • ${businessLocation}` : ''}</p>
                  ${businessPhone ? `<p class="meta">${businessPhone}</p>` : ''}
                  <p class="meta">Date: ${new Date().toLocaleDateString()}</p>
                  <p class="meta"><strong>Job:</strong> ${activeJobName}</p>
                </div>

                <h2>Client: ${resolvedClientName}</h2>
                ${resolvedClientPhone ? `<p>Phone: ${resolvedClientPhone}</p>` : ''}

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
                    ${lineItems
                        .map(
                            (item) => `
                      <tr>
                        <td>${item.description || ''}</td>
                        <td>${item.quantity}</td>
                        <td>$${Number(item.unitPrice).toFixed(2)}</td>
                        <td>$${(Number(item.quantity) * Number(item.unitPrice)).toFixed(2)}</td>
                      </tr>
                      ${
                          item.photoUri
                              ? `
                        <tr>
                          <td colspan="4">
                            <img src="${item.photoUri}" class="photo" alt="Before photo" />
                          </td>
                        </tr>
                      `
                              : ''
                      }
                    `,
                        )
                        .join('')}
                  </tbody>
                </table>

                <div class="total">Total: $${total.toFixed(2)}</div>

                ${notes ? `<p><strong>Notes:</strong><br>${notes.replace(/\n/g, '<br>')}</p>` : ''}

                <p style="margin-top: 50px; text-align: center; color: #666;">
                  Thank you for your business!<br>
                  ${businessPhone ? `Call or text ${businessPhone} with any questions.` : 'Contact us with any questions.'}
                </p>
              </body>
            </html>
        `;

        try {
            const {uri} = await Print.printToFileAsync({
                html: htmlContent,
                base64: false,
            });

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri, {
                    mimeType: 'application/pdf',
                    dialogTitle: `Quote for ${resolvedClientName}`,
                    UTI: 'com.adobe.pdf',
                });

                Alert.alert(
                    'Success!',
                    'PDF generated and share sheet opened.\n\nYou can send it via text, email, or WhatsApp.',
                );
            } else {
                Alert.alert(
                    'Sharing not available',
                    'PDF saved to cache but cannot share on this device.',
                );
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to generate PDF. Please try again.');
        }
    };

    const suggestTemplate = () => {
        if (photos.length === 0 && !jobName) {
            setStep('details');
            return;
        }
        const lowerName = jobName.toLowerCase();
        const match = JOB_TEMPLATES.find(
            (t) =>
                lowerName.includes(t.name.toLowerCase().split(' ')[0]) ||
                lowerName.includes(t.category.toLowerCase()),
        );
        if (match) {
            const cost = calculateJobCost(match);
            Alert.alert(
                `Suggested: ${match.name}`,
                `Template match found!\n\nEstimated: $${cost.suggested}\nTime: ${match.timeEstimateHours}h\n\nApply this template?`,
                [
                    {text: 'No thanks', style: 'cancel', onPress: () => setStep('details')},
                    {
                        text: 'Use template',
                        onPress: () => {
                            addNewQuote({
                                client_id: null,
                                client_name: '',
                                job_name: match.name,
                                quote_line_items: [],
                                notes: '',
                                total_amount: cost.suggested,
                                status: 'draft',
                                photos: [],
                            });

                            setJobName(match.name);
                            setLineItems([
                                {
                                    description: `Labor (${match.timeEstimateHours}h @ $${match.laborRate}/hr)`,
                                    quantity: 1,
                                    unitPrice: match.timeEstimateHours * match.laborRate,
                                    isLabor: true,
                                },
                                ...match.materials
                                    .filter((m) => m.qty > 0)
                                    .map((m) => ({
                                        description: m.name,
                                        quantity: m.qty,
                                        unitPrice: m.avgCost,
                                        isLabor: false,
                                    })),
                            ]);

                            setStep('details');
                        },
                    },
                ],
            );
        } else {
            setStep('details');
        }
    };

    if (step === 'photo' && !newQuote) {
        return (
            <View className="flex-1 bg-background">
                <View
                    className="flex-row items-center justify-between px-5 pb-3"
                    style={{paddingTop: insets.top + 16}}
                >
                    <TouchableOpacity onPress={() => router.back()}>
                        <Feather name="x" size={24} color={colors.foreground || '#111'}/>
                    </TouchableOpacity>
                    <Text className="text-foreground text-[17px] font-bold">New Quote</Text>
                    <View className="w-6"/>
                </View>

                <ScrollView contentContainerClassName="p-4 gap-4">
                    <View className="bg-secondary-foreground rounded-[20px] p-8 items-center gap-3">
                        <Feather name="camera" size={40} color="#94A3B8"/>
                        <Text className="text-[22px] font-extrabold text-white">Photo → Quote</Text>
                        <Text className="text-sm text-center leading-5 text-slate-400">
                            Take or upload photos of the job. We'll suggest the right template
                            automatically.
                        </Text>
                    </View>

                    {photos.length > 0 && (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="my-2">
                            {photos.map((uri, i) => (
                                <View key={i} className="mr-2.5 relative">
                                    <Image
                                        source={{uri}}
                                        className="rounded-[10px]"
                                        style={{width: 100, height: 100, borderRadius: 10}}
                                        contentFit="cover"
                                    />
                                    <TouchableOpacity
                                        className="bg-destructive absolute top-1 right-1 w-5 h-5 rounded-full items-center justify-center"
                                        onPress={() => setPhotos((prev) => prev.filter((_, j) => j !== i))}
                                    >
                                        <Feather name="x" size={12} color="#fff"/>
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </ScrollView>
                    )}

                    <View className="flex-row gap-3">
                        <TouchableOpacity
                            className="bg-card flex-1 rounded-[14px] border border-zinc-200 p-5 items-center gap-2.5"
                            onPress={takePhoto}
                            activeOpacity={0.8}
                        >
                            <Feather name="camera" size={24} color={colors.primary || '#3b82f6'}/>
                            <Text className="text-foreground text-[15px] font-semibold">Camera</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="bg-card flex-1 rounded-[14px] border border-zinc-200 p-5 items-center gap-2.5"
                            onPress={pickPhoto}
                            activeOpacity={0.8}
                        >
                            <Feather name="image" size={24} color={colors.primary || '#3b82f6'}/>
                            <Text className="text-foreground text-[15px] font-semibold">Gallery</Text>
                        </TouchableOpacity>
                    </View>

                    <View className="gap-2">
                        <Text className=" text-muted-foreground text-xs font-bold uppercase tracking-[0.5px]">
                            Job Description (optional)
                        </Text>
                        <TextInput
                            className="text-foreground bg-card border border-zinc-200 rounded-[12px] px-4 py-3 text-[15px]"
                            value={jobName}
                            onChangeText={setJobName}
                            placeholder="e.g. Faucet replacement, Drywall patch..."
                        />
                        <Text className="text-muted-foreground text-xs leading-[17px]">
                            We'll suggest a matching template based on your description
                        </Text>
                    </View>

                    <TouchableOpacity
                        className="bg-primary flex-row items-center justify-center gap-2 rounded-[14px] p-4"
                        onPress={suggestTemplate}
                        activeOpacity={0.85}
                    >
                        <Text className="text-white text-base font-bold">
                            {photos.length > 0 || jobName
                                ? 'Suggest Template & Continue'
                                : 'Skip to Quote Builder'}
                        </Text>
                        <Feather name="arrow-right" size={18} color="#fff"/>
                    </TouchableOpacity>
                </ScrollView>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            className="flex-1 bg-background"
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View
                className="flex-row items-center justify-between px-5 pb-3"
                style={{paddingTop: insets.top + 16}}
            >
                <TouchableOpacity
                    onPress={() => {
                        clearNewQuote();
                        setStep('photo');
                    }}
                >
                    <Feather name="arrow-left" size={24} color={colors.foreground || '#111'}/>
                </TouchableOpacity>
                <Text className="text-foreground text-[17px] font-bold">Quote Details</Text>
                <TouchableOpacity onPress={handleSave} disabled={saving}>
                    <Text className="text-primary text-base font-bold">
                        {saving ? 'Saving…' : 'Save'}
                    </Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                className="p-4"
                contentContainerStyle={{paddingBottom: 100}}
                keyboardShouldPersistTaps="handled"
            >
                {photos.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="my-2">
                        {photos.map((uri, i) => (
                            <Image
                                key={i}
                                source={{uri}}
                                className="mr-2.5"
                                style={{width: 100, height: 100, borderRadius: 10}}
                                contentFit="cover"
                            />
                        ))}
                    </ScrollView>
                )}

                <View className="mb-4 gap-2">
                    <Text className="text-muted-foreground text-xs font-bold uppercase tracking-[0.5px]">
                        Job Name *
                    </Text>
                    <TextInput
                        className="text-foreground bg-card border border-zinc-300 rounded-[12px] px-4 py-3 text-[15px]"
                        value={newQuote?.job_name ?? jobName}
                        onChangeText={(value) => {
                            setJobName(value);
                            updateNewQuote('job_name', value);
                        }}
                        placeholder="e.g. Faucet Replacement"
                    />
                </View>

                <View className="mb-4 gap-2">
                    <Text className="text-muted-foreground text-xs font-bold uppercase tracking-[0.5px]">
                        Client *
                    </Text>
                    {clients.length > 0 && (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
                            {clients.map((c) => (
                                <TouchableOpacity
                                    key={c.id}
                                    className="mr-2 rounded-full border border-zinc-200 px-3.5 py-2"
                                    style={{
                                        backgroundColor:
                                            selectedClientId === c.id ? colors.primary : colors.background,
                                        borderColor:
                                            selectedClientId === c.id ? colors.primary : colors.border,
                                    }}
                                    onPress={() =>
                                        setSelectedClientId(selectedClientId === c.id ? null : c.id)
                                    }
                                >
                                    <Text
                                        className="text-sm font-semibold"
                                        style={{
                                            color:
                                                selectedClientId === c.id ? '#fff' : colors.foreground,
                                        }}
                                    >
                                        {c.name}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    )}

                    <TextInput
                        className="text-foreground bg-card border border-zinc-300 rounded-[12px] px-4 py-3 text-[15px] mb-2"
                        value={clientName}
                        onChangeText={(v) => {
                            setClientName(v);
                            if (selectedClientId) {
                                const selected = clients.find((c) => c.id === selectedClientId);
                                if (selected && selected.name !== v) {
                                    setSelectedClientId(null);
                                }
                            }
                        }}
                        placeholder="Client name"
                        editable={!selectedClientId}
                    />
                    <TextInput
                        className="text-foreground bg-card border border-zinc-300 rounded-[12px] px-4 py-3 text-[15px]"
                        value={clientPhone}
                        onChangeText={setClientPhone}
                        placeholder="Client phone (optional)"
                        keyboardType="phone-pad"
                        editable={!selectedClientId}
                    />
                    {clients.length === 0 && (
                        <TouchableOpacity
                            className="mt-2 rounded-[12px] border border-dashed border-primary p-3 items-center"
                            onPress={() => router.push('/(tabs)/clients')}
                        >
                            <Text className="text-primary text-[15px] font-semibold">
                                Or add a saved client
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

                <View className="mb-4 gap-2">
                    <Text className="text-muted-foreground text-xs font-bold uppercase tracking-[0.5px]">
                        Line Items
                    </Text>
                    {lineItems?.map((li, idx) => (
                        <View
                            key={idx}
                            className="bg-card mb-2 rounded-[12px] border border-zinc-300 p-3 gap-2"
                        >
                            <TouchableOpacity
                                onPress={async () => {
                                    const result = await ImagePicker.launchCameraAsync({
                                        allowsEditing: true,
                                        quality: 0.7,
                                        aspect: [4, 3],
                                    });

                                    if (!result.canceled && result.assets && result.assets[0]) {
                                        updateLineItem(idx, 'photoUri', result.assets[0].uri);
                                    }
                                }}
                                className="mt-1 h-40 bg-gray-100 rounded-2xl overflow-hidden border border-dashed border-gray-400 flex items-center justify-center"
                            >
                                {li.photoUri ? (
                                    <Image
                                        source={{uri: li.photoUri}}
                                        className="w-full h-full"
                                        contentFit="cover"
                                    />
                                ) : (
                                    <View className="items-center">
                                        <Feather name="camera" size={24} color="#6b7280"/>
                                        <Text className="text-gray-500 mt-2 text-sm">
                                            Tap to take Before Photo
                                        </Text>
                                    </View>
                                )}
                            </TouchableOpacity>

                            <TextInput
                                className="text-foreground border border-zinc-300 rounded-[8px] px-2 py-1.5 text-sm font-semibold"
                                value={li.description}
                                onChangeText={(v) => updateLineItem(idx, 'description', v)}
                                placeholder="Description"
                            />
                            <View className="flex-row items-center gap-1.5">
                                <TextInput
                                    className="text-foreground w-12 rounded-[8px] border border-zinc-300 px-2 py-1.5 text-center text-[13px]"
                                    value={String(li.quantity)}
                                    onChangeText={(v) =>
                                        updateLineItem(idx, 'quantity', parseFloat(v) || 0)
                                    }
                                    keyboardType="decimal-pad"
                                    placeholder="Qty"
                                />
                                <Text className="text-sm text-muted-foreground">×</Text>
                                <TextInput
                                    className="text-foreground flex-1 rounded-[8px] border border-zinc-300 px-2 py-1.5 text-[13px]"
                                    value={String(li.unitPrice)}
                                    onChangeText={(v) =>
                                        updateLineItem(idx, 'unitPrice', parseFloat(v) || 0)
                                    }
                                    keyboardType="decimal-pad"
                                    placeholder="Price"
                                />
                                <Text className="text-primary min-w-[46px] text-right text-sm font-bold">
                                    =${(((li?.quantity || 0) * (li?.unitPrice || 0)).toFixed(2))}
                                </Text>
                                <TouchableOpacity onPress={() => removeLineItem(idx)}>
                                    <Feather name="trash-2" size={16} color="#ef4444"/>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}

                    <TouchableOpacity
                        className="flex-row items-center justify-center gap-2 rounded-[12px] border border-dashed p-3"
                        onPress={addLineItem}
                    >
                        <Feather name="plus" size={16} color={colors.primary || '#3b82f6'}/>
                        <Text className="text-primary text-sm font-semibold">Add Line Item</Text>
                    </TouchableOpacity>
                </View>

                <View className="mb-4 gap-2">
                    <Text className="text-muted-foreground text-xs font-bold uppercase tracking-[0.5px]">
                        Notes
                    </Text>
                    <TextInput
                        className="text-foreground bg-card border border-zinc-300 rounded-[12px] px-4 py-3 text-[15px] min-h-[90px]"
                        style={{textAlignVertical: 'top'}}
                        value={notes}
                        onChangeText={setNotes}
                        placeholder="Job details, scope, special conditions..."
                        multiline
                        numberOfLines={4}
                    />
                </View>

                <View className="bg-secondary-foreground mb-4 flex-row items-center justify-between rounded-[16px] p-5">
                    <Text className="text-sm font-semibold" style={{color: '#94A3B8'}}>
                        Quote Total
                    </Text>
                    <Text
                        className="text-[28px] font-extrabold tracking-[-0.5px]"
                        style={{color: '#fff'}}
                    >
                        ${total.toFixed(2)}
                    </Text>
                </View>

                <TouchableOpacity
                    className="bg-primary flex-row items-center justify-center gap-2 rounded-[14px] p-4"
                    onPress={handleSave}
                    activeOpacity={0.85}
                    disabled={saving}
                >
                    {saving ? (
                        <ActivityIndicator color="#fff"/>
                    ) : (
                        <>
                            <Feather name="file-text" size={18} color="#fff"/>
                            <Text className="text-white text-base font-bold">Save Quote</Text>
                        </>
                    )}
                </TouchableOpacity>
                <TouchableOpacity
                    className="bg-transparent border border-zinc-300 flex-row items-center justify-center gap-2 rounded-[14px] p-4 mt-4"
                    onPress={generateAndSharePDF}
                    activeOpacity={0.85}
                    disabled={saving}
                >
                    <Feather name="share" size={18} color={colors.foreground || '#111'}/>
                    <Text className="text-foreground text-base font-bold">Generate PDF</Text>
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
