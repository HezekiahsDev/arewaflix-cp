import React from "react";

import { Text, View } from "react-native";
import { ExternalLink } from "./ExternalLink";
import { MonoText } from "./StyledText";

export default function EditScreenInfo({ path }: { path: string }) {
  return (
    <View>
      <View className="mx-12 items-center">
        <Text className="text-center text-base leading-6 text-text dark:text-text-dark">
          Open up the code for this screen:
        </Text>

        <View className="my-2 rounded-sm bg-transparent px-1">
          <MonoText>{path}</MonoText>
        </View>

        <Text className="text-center text-base leading-6 text-text dark:text-text-dark">
          Change any of the text, save the file, and your app will automatically
          update.
        </Text>
      </View>

      <View className="mx-5 mt-4 items-center">
        <ExternalLink
          style={{ paddingVertical: 15 }}
          href="https://docs.expo.io/get-started/create-a-new-app/#opening-the-app-on-your-phonetablet"
        >
          <Text
            style={{ textAlign: "center" }}
            className="text-text dark:text-text-dark"
          >
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
