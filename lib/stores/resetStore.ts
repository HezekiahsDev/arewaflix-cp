import create from "zustand";

interface ResetState {
  email?: string;
  otp?: string;
  token?: string;
  setEmail: (email?: string) => void;
  setOtp: (otp?: string) => void;
  setToken: (token?: string) => void;
  clear: () => void;
}

export const useResetStore = create<ResetState>((set) => ({
  email: undefined,
  otp: undefined,
  token: undefined,
  setEmail: (email) => set(() => ({ email })),
  setOtp: (otp) => set(() => ({ otp })),
  setToken: (token) => set(() => ({ token })),
  clear: () =>
    set(() => ({ email: undefined, otp: undefined, token: undefined })),
}));

export default useResetStore;
