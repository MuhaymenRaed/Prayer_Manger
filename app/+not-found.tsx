import { Redirect } from "expo-router";

/** Any unknown route / deep link silently lands on the app. */
export default function NotFound() {
  return <Redirect href="/(tabs)" />;
}
