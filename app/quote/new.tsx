import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  Share,
} from 'react-native';
import {useRouter} from 'expo-router';
import {useQuote} from '@/context/quote-context';
import {useAuth} from '@/context/auth-context';
import {Image} from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import {quotesApi} from '@/lib/data';
import {uploadPhotoFromUri} from '@/lib/upload-photo';
import {publicQuoteUrl} from '@/lib/config';
import {estimateJobCost, estimateToDraftLineItems} from '@/lib/ai-estimate';
import {Feather} from '@expo/vector-icons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {calculateJobCost, JOB_TEMPLATES} from '@/data/templates';
import useThemedNavigation from '@/hooks/use-navigation-theme';
import {useProfile} from '@/context/profile-context';
import {useNewQuoteDraft} from '@/hooks/use-new-quote-draft';

export default function NewQuote() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {user} = useAuth();
  const {clients, fetchQuotes, updateQuote} = useQuote();
  const draft = useNewQuoteDraft();
  const {profile} = useProfile();
  const {colors} = useThemedNavigation();

  const [step, setStep] = useState<'photo' | 'details'>(
    draft.lineItems.length > 0 || draft.jobName ? 'details' : 'photo',
  );
  const [saving, setSaving] = useState(false);
  const [estimating, setEstimating] = useState(false);
  const [savedQuoteId, setSavedQuoteId] = useState<string | null>(null);
  const [postSaveVisible, setPostSaveVisible] = useState(false);
  const [postSaveBusy, setPostSaveBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const {status} = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera access is required to take before photos.');
      }
    })();
  }, []);

  useEffect(() => {
    if (!draft.selectedClientId) return;
    const client = clients.find((c) => c.id === draft.selectedClientId);
    if (client) {
      draft.setClientName(client.name || '');
      draft.setClientPhone(client.phone || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.selectedClientId, clients]);

  const resolvedName = () => {
    if (draft.selectedClientId) {
      const client = clients.find((c) => c.id === draft.selectedClientId);
      if (client?.name) return client.name;
    }
    return draft.clientName.trim();
  };

  const resolvedPhone = () => {
    if (draft.selectedClientId) {
      const client = clients.find((c) => c.id === draft.selectedClientId);
      if (client?.phone) return client.phone;
    }
    return draft.clientPhone.trim();
  };

  const resolvedClientName = resolvedName();
  const resolvedClientPhone = resolvedPhone();
  const total = draft.total;

  const canSave =
    Boolean(resolvedClientName) &&
    draft.lineItems.length > 0 &&
    Boolean(draft.jobName.trim());

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
      draft.setPhotos((prev) => [...prev, ...uris].slice(0, 5));
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
        draft.setPhotos((prev) => [...prev, result.assets[0].uri].slice(0, 5));
      }
    } else {
      Alert.alert('Camera not available on web', 'Use the upload button instead.');
    }
  };

  const resetForm = () => {
    draft.reset();
  };

  const handleAiEstimate = async () => {
    if (!draft.jobName.trim() && draft.photos.length === 0) {
      Alert.alert('Need input', 'Add a short description and/or job photos for an AI estimate.');
      return;
    }
    if (!user?.id) {
      Alert.alert('Not logged in');
      return;
    }

    setEstimating(true);
    try {
      const photoUrls: string[] = [];
      for (const uri of draft.photos.slice(0, 3)) {
        if (uri.startsWith('http')) {
          photoUrls.push(uri);
        } else {
          try {
            photoUrls.push(await uploadPhotoFromUri(uri, user.id));
          } catch (e) {
            console.warn('photo upload for AI estimate failed', e);
          }
        }
      }

      const region = [profile?.city, profile?.state].filter(Boolean).join(', ');
      const estimate = await estimateJobCost({
        description: draft.jobName.trim(),
        photoUrls,
        hourlyRate: profile?.hourly_rate,
        region: region || undefined,
      });

      const confPct = Math.round((estimate.confidence || 0) * 100);
      Alert.alert(
        estimate.job_name || 'AI estimate',
        `${estimate.summary || ''}\n\nSuggested total: $${estimate.suggested}\nLabor ~${estimate.labor_hours}h @ $${estimate.labor_rate}/hr\nConfidence: ${confPct}%\n\nApply these line items to the quote?`,
        [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'Apply estimate',
            onPress: () => {
              const noteParts = [
                estimate.notes,
                estimate.upsells?.length
                  ? `Suggested upsells: ${estimate.upsells.join(', ')}`
                  : '',
              ].filter(Boolean);
              draft.applyTemplateDraft({
                jobName: estimate.job_name,
                totalAmount: estimate.suggested,
                notes: noteParts.join('\n') || draft.notes,
                lineItems: estimateToDraftLineItems(estimate),
              });
              setStep('details');
            },
          },
        ],
      );
    } catch (e: any) {
      console.error(e);
      Alert.alert(
        'AI estimate failed',
        e?.message || 'Check XAI_API_KEY on the edge function, or use a template instead.',
      );
    } finally {
      setEstimating(false);
    }
  };

  const handleSave = async () => {
    if (!resolvedClientName || draft.lineItems.length === 0) {
      Alert.alert('Error', 'Client name and at least one line item are required');
      return;
    }

    const activeJobName = draft.jobName.trim();
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
        draft.photos.map((photoUri) => uploadPhotoFromUri(photoUri, user.id)),
      );

      const client = draft.selectedClientId
        ? clients.find((c) => c.id === draft.selectedClientId) ?? null
        : null;

      const linePayload = [];
      for (const item of draft.lineItems) {
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
        notes: draft.notes || null,
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

      setSavedQuoteId(result.data.id);
      setPostSaveVisible(true);
    } catch (error: any) {
      console.error(error);
      Alert.alert('Save Failed', error.message || 'Please try again');
    } finally {
      setSaving(false);
    }
  };

  const finishAndLeave = () => {
    setPostSaveVisible(false);
    resetForm();
    router.back();
  };

  const handlePostSaveSend = async () => {
    if (!savedQuoteId) return;
    setPostSaveBusy(true);
    try {
      const publicLink = publicQuoteUrl(savedQuoteId);
      await updateQuote(savedQuoteId, {status: 'sent'});
      await Clipboard.setStringAsync(publicLink);
      try {
        await Share.share({
          message: `Here's your FixBid quote: ${publicLink}`,
          url: publicLink,
          title: `Quote for ${resolvedClientName}`,
        });
      } catch {
        // dismissed
      }
      Alert.alert('Link ready', 'Status set to Sent. Link is on the clipboard.');
      finishAndLeave();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not send quote');
    } finally {
      setPostSaveBusy(false);
    }
  };

  const handlePostSavePdf = async () => {
    setPostSaveBusy(true);
    try {
      await generateAndSharePDF();
    } finally {
      setPostSaveBusy(false);
    }
  };

  const handlePostSaveOpen = () => {
    if (!savedQuoteId) return;
    setPostSaveVisible(false);
    resetForm();
    router.replace(`/quote/${savedQuoteId}`);
  };

  const generateAndSharePDF = async () => {
    if (!resolvedClientName) {
      Alert.alert('Missing Info', 'Please select or enter a client name');
      return;
    }
    if (draft.lineItems.length === 0) {
      Alert.alert('No Items', 'Add at least one line item');
      return;
    }

    const businessName =
      profile?.business_name || profile?.full_name || 'Professional Handyman';
    const businessPhone = profile?.phone || '';
    const businessLocation = profile?.address || '';
    const activeJobName = draft.jobName.trim() || 'Quote';

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
                    <tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr>
                  </thead>
                  <tbody>
                    ${draft.lineItems
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
                          ? `<tr><td colspan="4"><img src="${item.photoUri}" class="photo" alt="Before" /></td></tr>`
                          : ''
                      }
                    `,
                      )
                      .join('')}
                  </tbody>
                </table>
                <div class="total">Total: $${total.toFixed(2)}</div>
                ${draft.notes ? `<p><strong>Notes:</strong><br>${draft.notes.replace(/\n/g, '<br>')}</p>` : ''}
              </body>
            </html>
        `;

    try {
      const {uri} = await Print.printToFileAsync({html: htmlContent, base64: false});
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Quote for ${resolvedClientName}`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Sharing not available', 'PDF saved to cache but cannot share on this device.');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to generate PDF. Please try again.');
    }
  };

  const suggestTemplate = () => {
    if (draft.photos.length === 0 && !draft.jobName) {
      setStep('details');
      return;
    }
    const lowerName = draft.jobName.toLowerCase();
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
              draft.applyTemplateDraft({
                jobName: match.name,
                totalAmount: cost.suggested,
                lineItems: [
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
                ],
              });
              setStep('details');
            },
          },
        ],
      );
    } else {
      setStep('details');
    }
  };

  const postSaveSheet = (
    <Modal visible={postSaveVisible} transparent animationType="fade" onRequestClose={finishAndLeave}>
      <View className="flex-1 items-center justify-end bg-black/50">
        <View
          className="w-full rounded-t-3xl bg-card px-5 pt-5"
          style={{paddingBottom: Math.max(insets.bottom, 16) + 8}}
        >
          <View className="mb-4 items-center">
            <View className="mb-3 h-14 w-14 items-center justify-center rounded-full bg-green-100">
              <Feather name="check" size={28} color="#15803d" />
            </View>
            <Text className="text-foreground text-xl font-extrabold">Quote saved</Text>
            <Text className="text-muted-foreground mt-1 text-center text-[14px]">
              ${total.toFixed(2)} · {resolvedClientName || 'Client'}
            </Text>
          </View>

          <TouchableOpacity
            className="mb-2 flex-row items-center justify-center gap-2 rounded-2xl bg-primary p-4"
            onPress={handlePostSaveSend}
            disabled={postSaveBusy}
            activeOpacity={0.85}
          >
            {postSaveBusy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Feather name="send" size={18} color="#fff" />
                <Text className="text-base font-bold text-white">Send to client</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            className="mb-2 flex-row items-center justify-center gap-2 rounded-2xl border border-zinc-300 p-4"
            onPress={handlePostSavePdf}
            disabled={postSaveBusy}
            activeOpacity={0.85}
          >
            <Feather name="share" size={18} color={colors.foreground || '#111'} />
            <Text className="text-foreground text-base font-bold">Share PDF</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="mb-2 flex-row items-center justify-center gap-2 rounded-2xl border border-zinc-300 p-4"
            onPress={handlePostSaveOpen}
            disabled={postSaveBusy}
            activeOpacity={0.85}
          >
            <Feather name="eye" size={18} color={colors.foreground || '#111'} />
            <Text className="text-foreground text-base font-bold">Open quote</Text>
          </TouchableOpacity>

          <TouchableOpacity className="items-center py-3" onPress={finishAndLeave} disabled={postSaveBusy}>
            <Text className="text-muted-foreground text-[15px] font-semibold">Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  if (step === 'photo') {
    return (
      <View className="flex-1 bg-background">
        {postSaveSheet}
        <View
          className="flex-row items-center justify-between px-5 pb-3"
          style={{paddingTop: insets.top + 16}}
        >
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="x" size={24} color={colors.foreground || '#111'} />
          </TouchableOpacity>
          <Text className="text-foreground text-[17px] font-bold">New Quote</Text>
          <View className="w-6" />
        </View>

        <ScrollView contentContainerClassName="gap-4 p-4">
          <View className="items-center gap-3 rounded-[20px] bg-secondary-foreground p-8">
            <Feather name="camera" size={40} color="#94A3B8" />
            <Text className="text-[22px] font-extrabold text-white">Photo → Quote</Text>
            <Text className="text-center text-sm leading-5 text-slate-400">
              Add photos and a short description. Get an AI cost estimate or match a template.
            </Text>
          </View>

          {draft.photos.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="my-2">
              {draft.photos.map((uri, i) => (
                <View key={i} className="relative mr-2.5">
                  <Image
                    source={{uri}}
                    style={{width: 100, height: 100, borderRadius: 10}}
                    contentFit="cover"
                  />
                  <TouchableOpacity
                    className="absolute right-1 top-1 h-5 w-5 items-center justify-center rounded-full bg-destructive"
                    onPress={() => draft.setPhotos((prev) => prev.filter((_, j) => j !== i))}
                  >
                    <Feather name="x" size={12} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}

          <View className="flex-row gap-3">
            <TouchableOpacity
              className="flex-1 items-center gap-2.5 rounded-[14px] border border-zinc-200 bg-card p-5"
              onPress={takePhoto}
              activeOpacity={0.8}
            >
              <Feather name="camera" size={24} color={colors.primary || '#3b82f6'} />
              <Text className="text-foreground text-[15px] font-semibold">Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 items-center gap-2.5 rounded-[14px] border border-zinc-200 bg-card p-5"
              onPress={pickPhoto}
              activeOpacity={0.8}
            >
              <Feather name="image" size={24} color={colors.primary || '#3b82f6'} />
              <Text className="text-foreground text-[15px] font-semibold">Gallery</Text>
            </TouchableOpacity>
          </View>

          <View className="gap-2">
            <Text className="text-muted-foreground text-xs font-bold uppercase tracking-[0.5px]">
              Job description
            </Text>
            <TextInput
              className="rounded-[12px] border border-zinc-200 bg-card px-4 py-3 text-[15px] text-foreground"
              value={draft.jobName}
              onChangeText={draft.setJobName}
              placeholder="e.g. Faucet replacement, Drywall patch..."
            />
          </View>

          <TouchableOpacity
            className="flex-row items-center justify-center gap-2 rounded-[14px] bg-primary p-4"
            onPress={handleAiEstimate}
            activeOpacity={0.85}
            disabled={estimating}
          >
            {estimating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Feather name="cpu" size={18} color="#fff" />
                <Text className="text-base font-bold text-white">AI cost estimate</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-row items-center justify-center gap-2 rounded-[14px] border border-zinc-300 p-4"
            onPress={suggestTemplate}
            activeOpacity={0.85}
            disabled={estimating}
          >
            <Text className="text-foreground text-base font-bold">
              {draft.photos.length > 0 || draft.jobName
                ? 'Suggest template instead'
                : 'Skip to quote builder'}
            </Text>
            <Feather name="arrow-right" size={18} color={colors.foreground || '#111'} />
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  const footerPad = Math.max(insets.bottom, 12);

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {postSaveSheet}

      <View
        className="flex-row items-center justify-between px-5 pb-3"
        style={{paddingTop: insets.top + 16}}
      >
        <TouchableOpacity onPress={() => setStep('photo')}>
          <Feather name="arrow-left" size={24} color={colors.foreground || '#111'} />
        </TouchableOpacity>
        <Text className="text-foreground text-[17px] font-bold">Quote details</Text>
        <TouchableOpacity onPress={handleAiEstimate} disabled={estimating} className="px-1">
          {estimating ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Feather name="cpu" size={22} color={colors.primary || '#f97316'} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{paddingBottom: 140 + footerPad}}
        keyboardShouldPersistTaps="handled"
      >
        {draft.photos.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="my-2">
            {draft.photos.map((uri, i) => (
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
            Job name *
          </Text>
          <TextInput
            className="rounded-[12px] border border-zinc-300 bg-card px-4 py-3 text-[15px] text-foreground"
            value={draft.jobName}
            onChangeText={draft.setJobName}
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
                      draft.selectedClientId === c.id ? colors.primary : colors.background,
                    borderColor:
                      draft.selectedClientId === c.id ? colors.primary : colors.border,
                  }}
                  onPress={() =>
                    draft.setSelectedClientId(
                      draft.selectedClientId === c.id ? null : c.id,
                    )
                  }
                >
                  <Text
                    className="text-sm font-semibold"
                    style={{
                      color: draft.selectedClientId === c.id ? '#fff' : colors.foreground,
                    }}
                  >
                    {c.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <TextInput
            className="mb-2 rounded-[12px] border border-zinc-300 bg-card px-4 py-3 text-[15px] text-foreground"
            value={draft.clientName}
            onChangeText={(v) => {
              draft.setClientName(v);
              if (draft.selectedClientId) {
                const selected = clients.find((c) => c.id === draft.selectedClientId);
                if (selected && selected.name !== v) draft.setSelectedClientId(null);
              }
            }}
            placeholder="Client name"
            editable={!draft.selectedClientId}
          />
          <TextInput
            className="rounded-[12px] border border-zinc-300 bg-card px-4 py-3 text-[15px] text-foreground"
            value={draft.clientPhone}
            onChangeText={draft.setClientPhone}
            placeholder="Client phone (optional)"
            keyboardType="phone-pad"
            editable={!draft.selectedClientId}
          />
          {draft.selectedClientId ? (
            <TouchableOpacity onPress={() => draft.setSelectedClientId(null)} className="mt-1">
              <Text className="text-primary text-sm font-semibold">Clear selection / edit name</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View className="mb-4 gap-2">
          <Text className="text-muted-foreground text-xs font-bold uppercase tracking-[0.5px]">
            Line items
          </Text>
          {draft.lineItems.map((li, idx) => (
            <View
              key={idx}
              className="mb-2 gap-2 rounded-[12px] border border-zinc-300 bg-card p-3"
            >
              <TouchableOpacity
                onPress={async () => {
                  const result = await ImagePicker.launchCameraAsync({
                    allowsEditing: true,
                    quality: 0.7,
                    aspect: [4, 3],
                  });
                  if (!result.canceled && result.assets?.[0]) {
                    draft.updateLineItem(idx, 'photoUri', result.assets[0].uri);
                  }
                }}
                className="mt-1 h-40 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-gray-400 bg-gray-100"
              >
                {li.photoUri ? (
                  <Image source={{uri: li.photoUri}} className="h-full w-full" contentFit="cover" />
                ) : (
                  <View className="items-center">
                    <Feather name="camera" size={24} color="#6b7280" />
                    <Text className="mt-2 text-sm text-gray-500">Tap for before photo</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TextInput
                className="rounded-[8px] border border-zinc-300 px-2 py-1.5 text-sm font-semibold text-foreground"
                value={li.description}
                onChangeText={(v) => draft.updateLineItem(idx, 'description', v)}
                placeholder="Description"
              />
              <View className="flex-row items-center gap-1.5">
                <TextInput
                  className="w-12 rounded-[8px] border border-zinc-300 px-2 py-1.5 text-center text-[13px] text-foreground"
                  value={String(li.quantity)}
                  onChangeText={(v) => draft.updateLineItem(idx, 'quantity', parseFloat(v) || 0)}
                  keyboardType="decimal-pad"
                  placeholder="Qty"
                />
                <Text className="text-sm text-muted-foreground">×</Text>
                <TextInput
                  className="flex-1 rounded-[8px] border border-zinc-300 px-2 py-1.5 text-[13px] text-foreground"
                  value={String(li.unitPrice)}
                  onChangeText={(v) => draft.updateLineItem(idx, 'unitPrice', parseFloat(v) || 0)}
                  keyboardType="decimal-pad"
                  placeholder="Price"
                />
                <Text className="text-primary min-w-[52px] text-right text-sm font-bold">
                  ${((li?.quantity || 0) * (li?.unitPrice || 0)).toFixed(2)}
                </Text>
                <TouchableOpacity onPress={() => draft.removeLineItem(idx)}>
                  <Feather name="trash-2" size={16} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))}

          <TouchableOpacity
            className="flex-row items-center justify-center gap-2 rounded-[12px] border border-dashed p-3"
            onPress={draft.addLineItem}
          >
            <Feather name="plus" size={16} color={colors.primary || '#3b82f6'} />
            <Text className="text-primary text-sm font-semibold">Add line item</Text>
          </TouchableOpacity>
        </View>

        <View className="mb-4 gap-2">
          <Text className="text-muted-foreground text-xs font-bold uppercase tracking-[0.5px]">
            Notes
          </Text>
          <TextInput
            className="min-h-[90px] rounded-[12px] border border-zinc-300 bg-card px-4 py-3 text-[15px] text-foreground"
            style={{textAlignVertical: 'top'}}
            value={draft.notes}
            onChangeText={draft.setNotes}
            placeholder="Job details, scope, special conditions..."
            multiline
            numberOfLines={4}
          />
        </View>

        <TouchableOpacity
          className="mb-4 flex-row items-center justify-center gap-2 rounded-[14px] border border-zinc-300 p-3"
          onPress={generateAndSharePDF}
          activeOpacity={0.85}
          disabled={saving}
        >
          <Feather name="share" size={18} color={colors.foreground || '#111'} />
          <Text className="text-foreground text-base font-bold">Generate PDF</Text>
        </TouchableOpacity>
      </ScrollView>

      <View
        className="absolute bottom-0 left-0 right-0 border-t border-zinc-200 bg-card px-4 pt-3"
        style={{
          paddingBottom: footerPad,
          shadowColor: '#000',
          shadowOpacity: 0.08,
          shadowRadius: 12,
          shadowOffset: {width: 0, height: -4},
          elevation: 12,
        }}
      >
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-muted-foreground text-sm font-semibold">Quote total</Text>
          <Text className="text-foreground text-[22px] font-extrabold tracking-tight">
            ${total.toFixed(2)}
          </Text>
        </View>
        <TouchableOpacity
          className={`flex-row items-center justify-center gap-2 rounded-[14px] p-4 ${
            canSave && !saving ? 'bg-primary' : 'bg-zinc-300'
          }`}
          onPress={handleSave}
          activeOpacity={0.85}
          disabled={!canSave || saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Feather name="file-text" size={18} color="#fff" />
              <Text className="text-base font-bold text-white">Save quote</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
