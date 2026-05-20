import { View } from "react-native";
import { useMutation } from "@tanstack/react-query";
import { Button, Card, Text } from "react-native-paper";

import { useSession } from "@/hooks/useSession";
import { supabase } from "@/lib/supabase";

export default function DashboardScreen() {
  const { session } = useSession();

  const signOutMutation = useMutation({
	mutationFn: async () => {
	  const { error } = await supabase.auth.signOut();

	  if (error) {
		throw error;
	  }
	},
  });

  return (
	<View style={{ flex: 1, justifyContent: "center", padding: 16 }}>
	  <Card>
		<Card.Content style={{ gap: 12 }}>
		  <Text variant="headlineSmall">Dashboard</Text>
		  <Text variant="bodyMedium">Signed in as: {session?.user.email ?? "Unknown user"}</Text>

		  <Button
			mode="outlined"
			onPress={() => signOutMutation.mutate()}
			loading={signOutMutation.isPending}
		  >
			Sign out
		  </Button>
		</Card.Content>
	  </Card>
	</View>
  );
}


