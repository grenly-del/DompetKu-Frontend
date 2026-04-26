import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import {
  useFonts,
  Poppins_300Light,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";

const { width } = Dimensions.get("window");

export default function SplashScreen() {
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    Poppins_300Light,
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  // Animation values
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(30)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineTranslateY = useRef(new Animated.Value(20)).current;
  const dotOpacity1 = useRef(new Animated.Value(0.3)).current;
  const dotOpacity2 = useRef(new Animated.Value(0.3)).current;
  const dotOpacity3 = useRef(new Animated.Value(0.3)).current;
  const bottomTextOpacity = useRef(new Animated.Value(0)).current;

  // Decorative circle animations
  const circle1Scale = useRef(new Animated.Value(0)).current;
  const circle1Opacity = useRef(new Animated.Value(0)).current;
  const circle2Scale = useRef(new Animated.Value(0)).current;
  const circle2Opacity = useRef(new Animated.Value(0)).current;

  // Gold accent line
  const accentWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!fontsLoaded) return;

    // Sequence of animations
    Animated.sequence([
      // 1. Background circles expand
      Animated.parallel([
        Animated.timing(circle1Scale, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(circle1Opacity, {
          toValue: 0.07,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(circle2Scale, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(circle2Opacity, {
          toValue: 0.05,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),

      // 2. Logo appears with bounce
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),

      // 3. Title slides up and fades in
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(titleTranslateY, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),

      // 4. Gold accent line + tagline
      Animated.parallel([
        Animated.timing(accentWidth, {
          toValue: 1,
          duration: 400,
          useNativeDriver: false,
        }),
        Animated.timing(taglineOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(taglineTranslateY, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(bottomTextOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Loading dots animation (looping)
    const dotAnimation = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(dotOpacity1, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dotOpacity2, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dotOpacity3, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.parallel([
            Animated.timing(dotOpacity1, {
              toValue: 0.3,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(dotOpacity2, {
              toValue: 0.3,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(dotOpacity3, {
              toValue: 0.3,
              duration: 200,
              useNativeDriver: true,
            }),
          ]),
        ])
      ).start();
    };

    const dotsTimer = setTimeout(dotAnimation, 2200);

    // Navigate to auth after splash
    const navTimer = setTimeout(() => {
      router.replace("/auth" as never);
    }, 4000);

    return () => {
      clearTimeout(dotsTimer);
      clearTimeout(navTimer);
    };
  }, [
    accentWidth,
    bottomTextOpacity,
    circle1Opacity,
    circle1Scale,
    circle2Opacity,
    circle2Scale,
    dotOpacity1,
    dotOpacity2,
    dotOpacity3,
    fontsLoaded,
    logoOpacity,
    logoScale,
    router,
    taglineOpacity,
    taglineTranslateY,
    titleOpacity,
    titleTranslateY,
  ]);

  if (!fontsLoaded) {
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#006B6B" />

      {/* Background decorative circles */}
      <Animated.View
        style={[
          styles.decorCircle,
          styles.circle1,
          {
            transform: [{ scale: circle1Scale }],
            opacity: circle1Opacity,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.decorCircle,
          styles.circle2,
          {
            transform: [{ scale: circle2Scale }],
            opacity: circle2Opacity,
          },
        ]}
      />

      {/* Main content */}
      <View style={styles.content}>
        {/* Logo */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              transform: [{ scale: logoScale }],
              opacity: logoOpacity,
            },
          ]}
        >
          <View style={styles.logoGlow} />
          <Image
            source={require("../assets/Logo-Dompetku-transparant.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>

        {/* App Name */}
        <Animated.View
          style={{
            opacity: titleOpacity,
            transform: [{ translateY: titleTranslateY }],
          }}
        >
          <Text style={styles.appName}>DompetKu</Text>
        </Animated.View>

        {/* Gold accent line */}
        <Animated.View
          style={[
            styles.accentLine,
            {
              width: accentWidth.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 60],
              }),
            },
          ]}
        />

        {/* Tagline */}
        <Animated.View
          style={{
            opacity: taglineOpacity,
            transform: [{ translateY: taglineTranslateY }],
          }}
        >
          <Text style={styles.tagline}>
            Budgeting lebih mudah, hidup lebih teratur
          </Text>
        </Animated.View>

        {/* Loading dots */}
        <View style={styles.dotsContainer}>
          <Animated.View
            style={[styles.dot, styles.dotGold, { opacity: dotOpacity1 }]}
          />
          <Animated.View
            style={[styles.dot, styles.dotGreen, { opacity: dotOpacity2 }]}
          />
          <Animated.View
            style={[styles.dot, styles.dotWhite, { opacity: dotOpacity3 }]}
          />
        </View>
      </View>

      {/* Bottom version text */}
      <Animated.View
        style={[styles.bottomSection, { opacity: bottomTextOpacity }]}
      >
        <Text style={styles.versionText}>Personal Budgeting App</Text>
        <Text style={styles.copyrightText}>v1.0.0</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#008080",
    overflow: "hidden",
  },
  decorCircle: {
    position: "absolute",
    borderRadius: 9999,
    backgroundColor: "#FFFFFF",
  },
  circle1: {
    width: width * 1.5,
    height: width * 1.5,
    top: -width * 0.4,
    right: -width * 0.4,
  },
  circle2: {
    width: width * 1.2,
    height: width * 1.2,
    bottom: -width * 0.3,
    left: -width * 0.3,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  logoContainer: {
    width: 180,
    height: 180,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  logoGlow: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
  },
  logo: {
    width: 160,
    height: 160,
  },
  appName: {
    fontSize: 36,
    fontFamily: "Poppins_700Bold",
    color: "#FFFFFF",
    letterSpacing: 1.5,
    textAlign: "center",
    marginBottom: 16,
    textShadowColor: "rgba(0, 0, 0, 0.15)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  accentLine: {
    height: 3,
    backgroundColor: "#F2C94C",
    borderRadius: 2,
    marginBottom: 16,
  },
  tagline: {
    fontSize: 15,
    fontFamily: "Poppins_400Regular",
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    letterSpacing: 0.3,
    lineHeight: 24,
    fontStyle: "italic",
  },
  dotsContainer: {
    flexDirection: "row",
    marginTop: 48,
    gap: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotGold: {
    backgroundColor: "#F2C94C",
  },
  dotGreen: {
    backgroundColor: "#34E0A1",
  },
  dotWhite: {
    backgroundColor: "#FFFFFF",
  },
  bottomSection: {
    paddingBottom: 50,
    alignItems: "center",
  },
  versionText: {
    fontSize: 13,
    fontFamily: "Poppins_500Medium",
    color: "rgba(255, 255, 255, 0.7)",
    letterSpacing: 0.5,
  },
  copyrightText: {
    fontSize: 12,
    fontFamily: "Poppins_300Light",
    color: "rgba(255, 255, 255, 0.5)",
    marginTop: 4,
  },
});
