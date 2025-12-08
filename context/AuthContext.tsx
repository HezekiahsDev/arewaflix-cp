import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type AuthUser = {
  id: number;
  username: string;
  email: string;
  ip_address: string;
  first_name: string;
  last_name: string;
  gender: string;
  email_code: string;
  device_id: string;
  language: string;
  avatar: string;
  cover: string;
  src: string;
  country_id: number;
  age: number;
  about: string | null;
  google: string;
  facebook: string;
  twitter: string;
  instagram: string;
  active: number;
  admin: number;
  verified: number;
  last_active: number;
  registered: string;
  time: number;
  is_pro: number;
  pro_type: number;
  imports: number;
  uploads: number;
  wallet: number;
  balance: string;
  video_mon: number;
  age_changed: number;
  donation_paypal_email: string;
  user_upload_limit: string;
  two_factor: number;
  google_secret: string;
  authy_id: string;
  two_factor_method: string;
  last_month: string | null;
  active_time: number;
  active_expire: string;
  phone_number: string;
  subscriber_price: string;
  monetization: number;
  new_email: string;
  fav_category: string;
  total_ads: number;
  suspend_upload: number;
  suspend_import: number;
  paystack_ref: string;
  ConversationId: string;
  point_day_expire: number;
  points: number;
  daily_points: number;
  converted_points: number;
  info_file: string;
  google_tracking_code: string;
  newsletters: number;
  vk: string;
  qq: string;
  wechat: string;
  discord: string;
  mailru: string;
  linkedIn: string;
  pause_history: number;
  tv_code: string;
  permission: string | null;
  referrer: number;
  ref_user_id: number;
  ref_type: string;
  privacy: string;
};

export type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  signIn: (user: AuthUser, token: string) => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = require("expo-router").useRouter();

  useEffect(() => {
    const loadAuthState = async () => {
      try {
        const storedUser = await AsyncStorage.getItem("auth_user");
        const storedToken = await AsyncStorage.getItem("auth_token");
        if (storedUser && storedToken) {
          setUser(JSON.parse(storedUser));
          setToken(storedToken);
        }
      } catch (error) {
        console.error("Failed to load auth state:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAuthState();
  }, []);

  const signIn = useCallback(async (nextUser: AuthUser, nextToken: string) => {
    setUser(nextUser);
    setToken(nextToken);
    try {
      await AsyncStorage.setItem("auth_user", JSON.stringify(nextUser));
      await AsyncStorage.setItem("auth_token", nextToken);
    } catch (error) {
      console.error("Failed to save auth state:", error);
    }
  }, []);

  const signOut = useCallback(async () => {
    setUser(null);
    setToken(null);
    try {
      await AsyncStorage.removeItem("auth_user");
      await AsyncStorage.removeItem("auth_token");
    } catch (error) {
      console.error("Failed to clear auth state:", error);
    }

    try {
      // navigate to the app index/home after signing out
      router.replace("/");
    } catch (err) {
      // ignore navigation errors
    }
  }, [router]);

  const value = useMemo<AuthContextValue>(() => {
    return {
      user,
      token,
      isAuthenticated: Boolean(user && token),
      signIn,
      signOut,
    };
  }, [user, token, signIn, signOut]);

  if (isLoading) {
    return null; // Or a loading component
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
