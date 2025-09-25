import React from "react";

import { Text, View } from "react-native";
import { ExternalLink } from "./ExternalLink";
import { MonoText } from "./StyledText";

export default function EditScreenInfo({ path }: { path: string }) {
  return (
    <View>
      <View className="items-center mx-12">
        <Text className="text-base leading-6 text-center text-text">
          Open up the code for this screen:
        </Text>

        <View className="rounded-sm px-1 my-2 bg-transparent">
          <MonoText>{path}</MonoText>
        </View>

        <Text className="text-base leading-6 text-center text-text">
          Change any of the text, save the file, and your app will automatically
          update.
        </Text>
      </View>

      <View className="mt-4 mx-5 items-center">
        <ExternalLink
          style={{ paddingVertical: 15 }}
          href="https://docs.expo.io/get-started/create-a-new-app/#opening-the-app-on-your-phonetablet"
        >
          <Text style={{ textAlign: "center" }} className="text-text">
            Tap here if your app doesn't automatically update after making
            changes
          </Text>
        </ExternalLink>
      </View>
    </View>
  );
}

/*
const styles = StyleSheet.create({
  getStartedContainer: {
    alignItems: 'center',
    marginHorizontal: 50,
  },
  homeScreenFilename: {
    marginVertical: 7,
  },
  codeHighlightContainer: {
    borderRadius: 3,
    paddingHorizontal: 4,
  },
  getStartedText: {
    fontSize: 17,
    lineHeight: 24,
    textAlign: 'center',
  },
  helpContainer: {
    marginTop: 15,
    marginHorizontal: 20,
    alignItems: 'center',
  },
  helpLink: {
    paddingVertical: 15,
  },
  helpLinkText: {
    textAlign: 'center',
  },
});
*/
