import { AuthUser } from "@/context/AuthContext";
import Constants from "expo-constants";
import { NativeModules, Platform } from "react-native";

const DEFAULT_BASE_URL = "https://api.arewaflix.io";

const API_BASE_URL = getSanitizedBaseUrl(
  typeof process !== "undefined" && process.env
    ? process.env.EXPO_PUBLIC_API_BASE_URL
    : undefined
);

console.log("🌐 API_BASE_URL:", API_BASE_URL);

// Helper function to get more specific error messages
const getNetworkErrorMessage = (error: any): string => {
  if (error.message?.includes("Network request failed")) {
    return `Cannot connect to server at ${API_BASE_URL}. Please check:\n• Server is running\n• Network connection\n• Firewall settings\n• If using simulator, try using your computer's IP address instead of localhost`;
  }
  return error.message || "Unknown network error";
};

function getSanitizedBaseUrl(value?: string): string {
  const base = (value && value.trim()) || DEFAULT_BASE_URL;
  const trimmed = base.replace(/\/$/, "");
  return resolveLoopbackHost(trimmed);
}

function resolveLoopbackHost(urlString: string): string {
  let parsed: URL;

  try {
    parsed = new URL(urlString);
  } catch (error) {
    return urlString;
  }

  if (!isLoopbackHostname(parsed.hostname)) {
    return urlString;
  }

  const derivedHost =
    getDevServerHostname() ??
    (Platform.OS === "android" ? "10.0.2.2" : undefined);

  if (!derivedHost || derivedHost === parsed.hostname) {
    return urlString;
  }

  parsed.hostname = derivedHost;

  const normalized = parsed.toString();
  return normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
}

function isLoopbackHostname(hostname: string): boolean {
  const normalized = hostname.replace(/^\[(.*)\]$/, "$1").toLowerCase();
  return (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "::1" ||
    normalized === "0.0.0.0"
  );
}

function getDevServerHostname(): string | null {
  const expoHost =
    (Constants as unknown as { expoConfig?: { hostUri?: string } }).expoConfig
      ?.hostUri ??
    (Constants as unknown as { expoGoConfig?: { hostUri?: string } })
      .expoGoConfig?.hostUri ??
    (
      Constants as unknown as {
        manifest?: { hostUri?: string };
      }
    ).manifest?.hostUri ??
    (
      Constants as unknown as {
        manifest2?: { extra?: { expoClient?: { hostUri?: string } } };
      }
    ).manifest2?.extra?.expoClient?.hostUri ??
    undefined;

  const fromExpo = extractHostname(expoHost);
  if (fromExpo) {
    return fromExpo;
  }

  const sourceCodeModule = (
    NativeModules as {
      SourceCode?: {
        scriptURL?: string;
      };
    }
  ).SourceCode;
  const scriptURL = sourceCodeModule?.scriptURL;
  const fromScript = extractHostname(scriptURL);
  if (fromScript) {
    return fromScript;
  }

  return null;
}

function extractHostname(uri?: string): string | null {
  if (!uri || typeof uri !== "string") {
    return null;
  }

  try {
    const normalised = uri.match(/^https?:\/\//) ? uri : `http://${uri}`;
    const parsed = new URL(normalised);
    return parsed.hostname || null;
  } catch (error) {
    const [host] = uri.split(":");
    return host || null;
  }
}

export interface SignupRequest {
  username: string;
  email: string;
  password: string;
  gender: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: AuthUser;
    token: string;
  };
}

export async function signup(data: SignupRequest): Promise<AuthResponse> {
  const url = `${API_BASE_URL}/api/v1/users/`;
  console.log("🔐 Signup Request:");
  console.log("URL:", url);
  console.log("Data:", data);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    console.log("Response Status:", response.status);
    console.log("Response Status Text:", response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Signup Error Response:", errorText);
      throw new Error(
        `Signup failed: ${response.status} ${response.statusText}`
      );
    }

    const result = await response.json();
    console.log("✅ Signup Success Response:", result);
    return result;
  } catch (error) {
    console.error("❌ Signup Network Error:", error);
    const errorMessage = getNetworkErrorMessage(error);
    throw new Error(`Signup failed: ${errorMessage}`);
  }
}

export async function login(data: LoginRequest): Promise<AuthResponse> {
  const url = `${API_BASE_URL}/api/v1/auth/login`;
  console.log("🔐 Login Request:");
  console.log("URL:", url);
  console.log("Data:", data);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    console.log("Response Status:", response.status);
    console.log("Response Status Text:", response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Login Error Response:", errorText);
      throw new Error(
        `Login failed: ${response.status} ${response.statusText}`
      );
    }

    const result = await response.json();
    console.log("✅ Login Success Response:", result);
    return result;
  } catch (error) {
    console.error("❌ Login Network Error:", error);
    const errorMessage = getNetworkErrorMessage(error);
    throw new Error(`Login failed: ${errorMessage}`);
  }
}

export interface ProfileResponse {
  success: boolean;
  message: string;
  data: AuthUser;
}

export async function getProfile(token: string): Promise<ProfileResponse> {
  const url = `${API_BASE_URL}/api/v1/users/me`;
  console.log("🔐 Get Profile Request:");
  console.log("URL:", url);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    console.log("Response Status:", response.status);
    console.log("Response Status Text:", response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Get Profile Error Response:", errorText);
      throw new Error(
        `Get Profile failed: ${response.status} ${response.statusText}`
      );
    }

    const result = await response.json();
    console.log("✅ Get Profile Success Response:", result);
    return result;
  } catch (error) {
    console.error("❌ Get Profile Network Error:", error);
    const errorMessage = getNetworkErrorMessage(error);
    throw new Error(`Get Profile failed: ${errorMessage}`);
  }
}
