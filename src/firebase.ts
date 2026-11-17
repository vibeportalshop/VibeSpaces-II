import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  signOut as fbSignOut,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Primary AI Studio Provisioned Firebase App
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Secondary Bridge to Existing Legacy VibeSpaces Database (vibespaces-web-82a77)
const legacyFirebaseConfig = {
  apiKey: 'AIzaSyBN4dPfn_N8HGBe3gtbj9fegKhQAvcrcUE',
  authDomain: 'vibespaces-web-82a77.firebaseapp.com',
  projectId: 'vibespaces-web-82a77',
  storageBucket: 'vibespaces-web-82a77.firebasestorage.app',
  messagingSenderId: '838833945338',
  appId: '1:838833945338:web:be4304176e26e794bca743',
};

const existingLegacy = getApps().find((a) => a.name === 'legacy-vibespaces');
const legacyApp = existingLegacy || initializeApp(legacyFirebaseConfig, 'legacy-vibespaces');
export const legacyDb = getFirestore(legacyApp);

export const OWNER_EMAILS = [
  'co.vibecartel@gmail.com',
  'aditya.shelke2011@gmail.com',
];

export function isAuthorizedOwnerEmail(email?: string | null): boolean {
  if (!email) return false;
  return OWNER_EMAILS.includes(email.trim().toLowerCase());
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate connection on boot as required by firebase-integration-rpc
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

// Fetch existing vibes from legacy vibespaces-web-82a77 database for seamless continuity
export async function fetchLegacyVibes() {
  try {
    const q = query(collection(legacyDb, 'vibes'), orderBy('createdAt', 'desc'), limit(20));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: `legacy_${d.id}`,
        title: String(data.title || 'Untitled Vibe'),
        content: String(data.content || ''),
        authorId: String(data.authorId || 'legacy_user'),
        authorName: data.anonymous ? 'Anonymous' : String(data.authorName || 'Viber'),
        authorPhoto: String(
          data.authorPhoto || 'https://api.dicebear.com/10.x/constellation/svg?seed=Orion'
        ),
        authorColor: String(data.authorColor || '#c084fc'),
        isOperator: Boolean(data.isOperator),
        anonymous: Boolean(data.anonymous),
        pinned: Boolean(data.pinned),
        category: String(data.category || 'General'),
        mediaType: 'none' as const,
        reactions: {
          heart: Array.isArray(data.reactions?.['❤️']) ? data.reactions['❤️'] : [],
          fire: Array.isArray(data.reactions?.['🔥']) ? data.reactions['🔥'] : [],
          laugh: Array.isArray(data.reactions?.['😂']) ? data.reactions['😂'] : [],
          cry: Array.isArray(data.reactions?.['😢']) ? data.reactions['😢'] : [],
        },
        comments: Array.isArray(data.comments)
          ? data.comments.map((c: Record<string, unknown>, idx: number) => ({
              id: `lc_${idx}`,
              authorId: String(c.userId || 'user'),
              authorName: String(c.username || 'Viber'),
              authorPhoto: 'https://api.dicebear.com/10.x/constellation/svg?seed=Lyra',
              text: String(c.text || ''),
              createdAt: 'From vibespaces-web',
            }))
          : [],
        createdAt: data.createdAt?.toDate
          ? data.createdAt.toDate().toISOString()
          : new Date().toISOString(),
        source: 'legacy' as const,
      };
    });
  } catch {
    return [];
  }
}

export {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  fbSignOut,
};
