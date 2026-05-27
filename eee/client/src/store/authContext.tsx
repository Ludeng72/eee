import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { UserResponse } from '../types';
import * as authApi from '../api/authApi';
import * as cryptoService from '../services/cryptoService';

// 密钥只存在内存闭包中——永远不会写入 localStorage/cookie
let masterKey: CryptoKey | null = null;
let rsaKeyPair: CryptoKeyPair | null = null;

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserResponse | null;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string, password: string,
    publicKey: JsonWebKey, encryptedPrivateKey: string,
    privateKeyIv: string, masterKeySalt: string, masterKeyTag: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  getPrivateKey: () => CryptoKey;
  getMasterKey: () => CryptoKey;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const deriveCryptoKeys = useCallback(async (password: string, u: UserResponse) => {
    const salt = cryptoService.base64ToArrayBuffer(u.masterKeySalt);
    const mk = await cryptoService.deriveMasterKey(password, new Uint8Array(salt));
    const pk = await cryptoService.unwrapPrivateKey(
      u.encryptedPrivateKey, u.privateKeyIv, u.masterKeyTag, mk
    );
    const pubKey = await cryptoService.importPublicKey(u.publicKey);
    masterKey = mk;
    rsaKeyPair = { privateKey: pk, publicKey: pubKey };
  }, []);

  const loginFn = useCallback(async (email: string, password: string) => {
    const result = await authApi.login(email, password);
    sessionStorage.setItem('accessToken', result.accessToken);
    sessionStorage.setItem('refreshToken', result.refreshToken);
    sessionStorage.setItem('user', JSON.stringify(result.user));
    // 保存加密私钥材料以便页面刷新后重新派生（Phase 8）
    sessionStorage.setItem('encryptedPrivateKey', result.user.encryptedPrivateKey);
    sessionStorage.setItem('privateKeyIv', result.user.privateKeyIv);
    sessionStorage.setItem('masterKeySalt', result.user.masterKeySalt);
    sessionStorage.setItem('masterKeyTag', result.user.masterKeyTag);

    await deriveCryptoKeys(password, result.user);
    setUser(result.user);
  }, [deriveCryptoKeys]);

  const registerFn = useCallback(async (
    email: string, password: string,
    publicKey: JsonWebKey, encryptedPrivateKey: string,
    privateKeyIv: string, masterKeySalt: string, masterKeyTag: string,
  ) => {
    const result = await authApi.register({
      email, password, publicKey, encryptedPrivateKey,
      privateKeyIv, masterKeySalt, masterKeyTag,
    });
    sessionStorage.setItem('accessToken', result.accessToken);
    sessionStorage.setItem('refreshToken', result.refreshToken);
    sessionStorage.setItem('user', JSON.stringify(result.user));
    sessionStorage.setItem('encryptedPrivateKey', encryptedPrivateKey);
    sessionStorage.setItem('privateKeyIv', privateKeyIv);
    sessionStorage.setItem('masterKeySalt', masterKeySalt);
    sessionStorage.setItem('masterKeyTag', masterKeyTag);

    // 注册页面已生成密钥对，直接设置
    // deriveCryptoKeys 会重新派生（为了一致性）
    await deriveCryptoKeys(password, result.user);
    setUser(result.user);
  }, [deriveCryptoKeys]);

  const logoutFn = useCallback(async () => {
    try {
      const rt = sessionStorage.getItem('refreshToken');
      if (rt) await authApi.logout(rt);
    } catch { /* ignore */ }
    sessionStorage.clear();
    masterKey = null;
    rsaKeyPair = null;
    setUser(null);
  }, []);

  // 初始化
  useState(() => {
    const stored = sessionStorage.getItem('user');
    const token = sessionStorage.getItem('accessToken');
    if (stored && token) {
      setUser(JSON.parse(stored));
    }
    setIsLoading(false);
  });

  function getPrivateKey(): CryptoKey {
    if (!rsaKeyPair?.privateKey) throw new Error('私钥未加载，请重新登录');
    return rsaKeyPair.privateKey;
  }

  function getMasterKey(): CryptoKey {
    if (!masterKey) throw new Error('主密钥未加载，请重新登录');
    return masterKey;
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!user,
        isLoading,
        user,
        login: loginFn,
        register: registerFn,
        logout: logoutFn,
        getPrivateKey,
        getMasterKey,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
