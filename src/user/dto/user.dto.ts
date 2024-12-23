export class UserDto {
  id: string;
  name?: string;
  country_code?: string;
  phone_number?: string;
  email?: string;
  avatar_url?: string;
  phone_confirmed_at?: Date;
  email_confirmed_at?: Date;
  last_sign_in_at?: Date;
  meta_data?: any;
  is_active?: boolean;
  banned_until?: Date;
  roles?: any;
  created_at?: Date;
  updated_at?: Date;
  upadted_by?: string;
  userPreferences?: any;
  isNotificationPermissionGranted?: boolean;
}
