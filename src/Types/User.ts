export type CURRENT_USER_TYPE = {
  accessToken: string;
  auth: any;
  displayName: string;
  email: null;
  emailVerified: boolean;
  isAnonymous: boolean;
  metadata: any;
  phoneNumber: null;
  photoURL: string;
  proactiveRefresh: any;
  providerData: any;
  providerId: string;
  reloadListener: null;
  reloadUserInfo: any;
  stsTokenManager: any;
  tenantId: null;
  uid: string;
};

export type COMMENTS = {
  createdAt: any;
  id: string;
  image: string;
  message: string;
  name: string;
  userId: string;
}[];
