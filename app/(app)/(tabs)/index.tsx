import { View } from "react-native";
import { Card, Text } from "react-native-paper";

import { useSession } from "@/hooks/useSession";

export default function HomeScreen() {
  const { session } = useSession();

  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 16 }}>
      <Card>
        <Card.Content style={{ gap: 12 }}>
          <Text variant="headlineSmall">Dashboard</Text>
          <Text variant="bodyMedium">
            Signed in as: {session?.user.email ?? "Unknown user"}
          </Text>
        </Card.Content>
      </Card>
    </View>
  );
}
