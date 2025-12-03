import { AuthUser } from "@/context/AuthContext";
import Constants from "expo-constants";
import { NativeModules, Platform } from "react-native";

const DEFAULT_BASE_URL = "https://api.arewaflix.io";

export const API_BASE_URL = getSanitizedBaseUrl(
  typeof process !== "undefined" && process.env
    ? process.env.EXPO_PUBLIC_API_BASE_URL
    : undefined
);

//console.log("🌐 API_BASE_URL:", API_BASE_URL);

// Helper function to get more specific error messages
const getNetworkErrorMessage = (error: any): string => {
  if (error.message?.includes("Network request failed")) {
    return `Cannot connect`;
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
  // Either `username` or `email` may be provided as the identifier.
  username?: string;
  email?: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user: AuthUser;
    token: string;
  };
  error?: {
    message: string;
    details?: string;
    stack?: string;
  };
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

export async function signup(data: SignupRequest): Promise<AuthResponse> {
  const url = `${API_BASE_URL}/api/v1/users/`;
  //console.log("🔐 Signup Request:");
  //console.log("URL:", url);
  //console.log("Data:", data);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    //console.log("Response Status:", response.status);
    //console.log("Response Status Text:", response.statusText);

    let result: any;
    try {
      result = await response.json();
    } catch {
      // If not JSON, treat as text error
      const errorText = await response.text();
      throw new Error(
        errorText || `Signup failed: ${response.status} ${response.statusText}`
      );
    }

    if (!response.ok) {
      // Return the error response if it's structured
      if (result && typeof result === "object" && "success" in result) {
        // Handle validation errors with errors array (field-specific errors)
        if (result.errors && Array.isArray(result.errors)) {
          const fieldErrors = result.errors
            .map((err: any) => `${err.field}: ${err.message}`)
            .join(", ");
          return {
            success: false,
            message: result.message || "Validation failed",
            errors: result.errors,
          } as AuthResponse;
        }

        // Handle other structured errors
        const errorMessage =
          result.error?.message ||
          result.message ||
          `Signup failed: ${response.status} ${response.statusText}`;
        return {
          success: false,
          message: errorMessage,
          error: result.error,
        } as AuthResponse;
      }
      throw new Error(
        result?.error?.message ||
          result?.message ||
          `Signup failed: ${response.status} ${response.statusText}`
      );
    }

    //console.log("✅ Signup Success Response:", result);
    return result;
  } catch (error) {
    console.error("❌ Signup Network Error:", error);
    const errorMessage = getNetworkErrorMessage(error);
    throw new Error(`Signup failed: ${errorMessage}`);
  }
}

export async function login(data: LoginRequest): Promise<AuthResponse> {
  const url = `${API_BASE_URL}/api/v1/auth/login`;
  //console.log("🔐 Login Request:");
  //console.log("URL:", url);
  //console.log("Data:", data);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    //console.log("Response Status:", response.status);
    //console.log("Response Status Text:", response.statusText);

    let result: any;
    try {
      result = await response.json();
    } catch {
      // If not JSON, treat as text error
      const errorText = await response.text();
      throw new Error(
        errorText || `Login failed: ${response.status} ${response.statusText}`
      );
    }

    if (!response.ok) {
      // Return the error response if it's structured
      if (result && typeof result === "object" && "success" in result) {
        // Handle validation errors with errors array (field-specific errors)
        if (result.errors && Array.isArray(result.errors)) {
          return {
            success: false,
            message: result.message || "Validation failed",
            errors: result.errors,
          } as AuthResponse;
        }

        // Handle other structured errors
        const errorMessage =
          result.error?.message ||
          result.message ||
          `Login failed: ${response.status} ${response.statusText}`;
        return {
          success: false,
          message: errorMessage,
          error: result.error,
        } as AuthResponse;
      }
      throw new Error(
        result?.error?.message ||
          result?.message ||
          `Login failed: ${response.status} ${response.statusText}`
      );
    }

    //console.log("✅ Login Success Response:", result);
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
  data?: AuthUser;
  error?: {
    message: string;
    details?: string;
    stack?: string;
  };
}

export async function getProfile(token: string): Promise<ProfileResponse> {
  const url = `${API_BASE_URL}/api/v1/users/me`;
  //console.log("🔐 Get Profile Request:");
  //console.log("URL:", url);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    //console.log("Response Status:", response.status);
    //console.log("Response Status Text:", response.statusText);

    let result: any;
    try {
      result = await response.json();
    } catch {
      // If not JSON, treat as text error
      const errorText = await response.text();
      throw new Error(
        errorText ||
          `Get Profile failed: ${response.status} ${response.statusText}`
      );
    }

    if (!response.ok) {
      // Return the error response if it's structured
      if (result && typeof result === "object" && "success" in result) {
        // Handle structured errors
        const errorMessage =
          result.error?.message ||
          result.message ||
          `Get Profile failed: ${response.status} ${response.statusText}`;
        return {
          success: false,
          message: errorMessage,
          error: result.error,
        } as ProfileResponse;
      }
      throw new Error(
        result?.error?.message ||
          result?.message ||
          `Get Profile failed: ${response.status} ${response.statusText}`
      );
    }

    //console.log("✅ Get Profile Success Response:", result);
    return result;
  } catch (error) {
    console.error("❌ Get Profile Network Error:", error);
    const errorMessage = getNetworkErrorMessage(error);
    throw new Error(`Get Profile failed: ${errorMessage}`);
  }
}

export interface DeleteAccountResponse {
  success: boolean;
  message: string;
  error?: {
    message: string;
    details?: string;
    stack?: string;
  };
}

export async function deleteAccount(
  token: string,
  reason: string
): Promise<DeleteAccountResponse> {
  const url = `${API_BASE_URL}/api/v1/users/me`;
  //console.log("🔐 Delete Account Request:");
  //console.log("URL:", url);

  try {
    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      // Match required payload from backend: include confirmation and reason
      body: JSON.stringify({ confirmation: "delete my account", reason }),
    });

    //console.log("Response Status:", response.status);
    //console.log("Response Status Text:", response.statusText);

    let result: any;
    try {
      result = await response.json();
    } catch {
      // If not JSON, treat as text error
      const errorText = await response.text();
      throw new Error(
        errorText ||
          `Delete Account failed: ${response.status} ${response.statusText}`
      );
    }

    if (!response.ok) {
      // Return the error response if it's structured
      if (result && typeof result === "object" && "success" in result) {
        // Handle structured errors
        const errorMessage =
          result.error?.message ||
          result.message ||
          `Delete Account failed: ${response.status} ${response.statusText}`;
        return {
          success: false,
          message: errorMessage,
          error: result.error,
        } as DeleteAccountResponse;
      }
      throw new Error(
        result?.error?.message ||
          result?.message ||
          `Delete Account failed: ${response.status} ${response.statusText}`
      );
    }

    //console.log("✅ Delete Account Success Response:", result);
    return result;
  } catch (error) {
    console.error("❌ Delete Account Network Error:", error);
    const errorMessage = getNetworkErrorMessage(error);
    throw new Error(`Delete Account failed: ${errorMessage}`);
  }
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface SimpleResponse {
  success: boolean;
  message: string;
}

/**
 * Request a password reset for an email address.
 * Assumes backend exposes POST /api/v1/auth/forgot-password that accepts { email }
 * Returns the parsed JSON response or throws an Error on network/parse problems.
 *
 * NOTE: If your backend uses a different path, update this function accordingly.
 */
export async function requestPasswordReset(
  data: ForgotPasswordRequest
): Promise<SimpleResponse> {
  const url = `${API_BASE_URL}/api/v1/auth/forgot-password/request`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    // Read text first to avoid "Already read" errors on some platforms
    const text = await response.text();
    let result: any = null;
    try {
      result = text ? JSON.parse(text) : null;
    } catch (e) {
      // not JSON, keep raw text in `result`
      result = text;
    }

    if (!response.ok) {
      if (result && typeof result === "object" && "success" in result) {
        return {
          success: false,
          message: result.message || "Request failed",
        } as SimpleResponse;
      }
      throw new Error(
        (result && (result.error?.message || result.message)) ||
          text ||
          `Request failed: ${response.status}`
      );
    }

    // If server returned structured JSON use it, otherwise return a success wrapper
    if (result && typeof result === "object") {
      return result;
    }
    return { success: true, message: String(text || "") } as SimpleResponse;
  } catch (error) {
    console.error("❌ Password Reset Network Error:", error);
    const errorMessage = getNetworkErrorMessage(error);
    throw new Error(`Password reset failed: ${errorMessage}`);
  }
}

export interface ConfirmResetRequest {
  email: string;
  otp: string;
  password: string;
}

/**
 * Confirm a password reset by sending email + otp + new password.
 * Backend expects POST /api/v1/auth/reset-password with body { email, otp, password }
 */
export async function confirmPasswordReset(
  data: ConfirmResetRequest
): Promise<SimpleResponse> {
  const url = `${API_BASE_URL}/api/v1/auth/reset-password`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const text = await response.text();
    let result: any = null;
    try {
      result = text ? JSON.parse(text) : null;
    } catch (e) {
      result = text;
    }

    if (!response.ok) {
      if (result && typeof result === "object" && "success" in result) {
        return {
          success: false,
          message: result.message || "Request failed",
        } as SimpleResponse;
      }
      throw new Error(
        (result && (result.error?.message || result.message)) ||
          text ||
          `Request failed: ${response.status}`
      );
    }

    if (result && typeof result === "object") {
      return result;
    }
    return { success: true, message: String(text || "") } as SimpleResponse;
  } catch (error) {
    console.error("❌ Reset Confirmation Network Error:", error);
    const errorMessage = getNetworkErrorMessage(error);
    throw new Error(`Reset confirmation failed: ${errorMessage}`);
  }
}

export interface VerifyOtpRequest {
  email: string;
  otp: string;
}

export interface VerifyOtpResponse extends SimpleResponse {
  token?: string;
}

/**
 * Verify OTP (email + otp). Backend endpoint: POST /api/v1/auth/verify-otp
 * Returns { success: true, message, token } on success (token optional/short-lived)
 */
export async function verifyOtp(
  data: VerifyOtpRequest
): Promise<VerifyOtpResponse> {
  const url = `${API_BASE_URL}/api/v1/auth/verify-otp`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const text = await response.text();
    let result: any = null;
    try {
      result = text ? JSON.parse(text) : null;
    } catch (e) {
      result = text;
    }

    if (!response.ok) {
      if (result && typeof result === "object" && "success" in result) {
        return {
          success: false,
          message: result.message || "Verification failed",
        } as VerifyOtpResponse;
      }
      throw new Error(
        (result && (result.error?.message || result.message)) ||
          text ||
          `Request failed: ${response.status}`
      );
    }

    if (result && typeof result === "object") {
      return result;
    }
    return { success: true, message: String(text || "") } as VerifyOtpResponse;
  } catch (error) {
    console.error("❌ OTP Verification Network Error:", error);
    const errorMessage = getNetworkErrorMessage(error);
    throw new Error(`OTP verification failed: ${errorMessage}`);
  }
}

export interface UpdateProfileRequest {
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  language?: string;
}

export interface UpdateProfileResponse {
  success: boolean;
  message: string;
  data?: AuthUser;
  error?: {
    message: string;
    details?: string;
    stack?: string;
  };
}

/**
 * Update current user's profile via PUT /api/v1/users/me
 */
export async function updateProfile(
  token: string,
  data: UpdateProfileRequest
): Promise<UpdateProfileResponse> {
  const url = `${API_BASE_URL}/api/v1/users/me`;

  try {
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    let result: any;
    try {
      result = await response.json();
    } catch {
      const errorText = await response.text();
      throw new Error(
        errorText ||
          `Update Profile failed: ${response.status} ${response.statusText}`
      );
    }

    if (!response.ok) {
      if (result && typeof result === "object" && "success" in result) {
        const errorMessage =
          result.error?.message || result.message || `Update failed`;
        return {
          success: false,
          message: errorMessage,
          error: result.error,
        } as UpdateProfileResponse;
      }
      throw new Error(
        result?.error?.message ||
          result?.message ||
          `Update Profile failed: ${response.status} ${response.statusText}`
      );
    }

    return result as UpdateProfileResponse;
  } catch (error) {
    console.error("❌ Update Profile Network Error:", error);
    const errorMessage = getNetworkErrorMessage(error);
    throw new Error(`Update Profile failed: ${errorMessage}`);
  }
}
