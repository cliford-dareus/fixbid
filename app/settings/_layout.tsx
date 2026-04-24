import {Stack} from "expo-router";

const ProfileLayout = () => {
    return(
        <Stack>
            <Stack.Screen name="index" options={{headerShown: false, presentation: 'modal'}}/>
            <Stack.Screen name="profile" options={{headerShown: false}}/>
            <Stack.Screen name="payment-setup" options={{headerShown: false}}/>
        </Stack>
    )
};

export default ProfileLayout;