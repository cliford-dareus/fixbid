import {Stack} from 'expo-router';

export default function QuotesLayout() {
    return (
        <Stack>
            <Stack.Screen name="index" options={{headerShown: false, title: 'Quotes'}}/>
        </Stack>
    );
}