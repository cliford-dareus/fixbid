import * as FileSystem from 'expo-file-system';
import {decode} from 'base64-arraybuffer';
import {supabase} from './supabase';

export const uploadQuotePhoto = async (uri: string, quoteId?: string): Promise<string | null> => {
    try {
        const fileName = `quote-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;

        // Read file as base64
        const base64 = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
        });

        const arrayBuffer = decode(base64);

        const {data, error} = await supabase.storage
            .from('quote-photos')
            .upload(fileName, arrayBuffer, {
                contentType: 'image/jpeg',
                upsert: true,
            });

        if (error) throw error;

        // Get public URL
        const {data: urlData} = supabase.storage
            .from('quote-photos')
            .getPublicUrl(fileName);

        return urlData.publicUrl;
    } catch (error) {
        console.error('Upload error:', error);
        return null;
    }
};