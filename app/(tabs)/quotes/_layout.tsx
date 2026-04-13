import {Stack} from 'expo-router';

export default function QuotesLayout() {
    return (
        <Stack>
            <Stack.Screen name="index" options={{headerShown: false, title: 'Quotes'}}/>
            <Stack.Screen name="new" options={{headerShown: false, title: 'New Quote'}}/>
            <Stack.Screen name="[id]" options={{headerShown: false, title: 'Quote Details'}}/>
        </Stack>
    );
}