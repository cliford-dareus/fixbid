import {File} from 'expo-file-system';
import { Buffer } from 'buffer';
import {supabase} from "@/lib/supabase";

export async function uploadPhotoFromUri(uri: string, userId: string) {
    const file = new File(uri);
    const fh = file.open();
    const bytes = fh.readBytes(fh.size!);

    const buffer = Buffer.from(bytes);
    const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
    const contentType = fileExt === 'jpg' ? 'image/jpeg' : `image/${fileExt}`;
    const fileName = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2, 15)}.${fileExt}`;

    const { error } = await supabase.storage
        .from('quote-photos')
        .upload(fileName, buffer, {
            contentType,
            upsert: false,
        });

    if (error) throw error;

    const { data } = supabase.storage.from('quote-photos').getPublicUrl(fileName);
    return data.publicUrl;
}
