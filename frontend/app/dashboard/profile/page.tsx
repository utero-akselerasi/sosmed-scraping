'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useI18n } from '@/lib/i18n';
import { apiClient } from '@/lib/api-client';
import { User, Mail, Lock, Save, Camera } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';

const inputClasses =
  'w-full rounded-lg border border-input bg-card py-2 pl-10 pr-4 text-sm text-card-foreground transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/40 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60';

export default function ProfilePage() {
  const { user, refetchUser } = useAuth();
  const { t } = useI18n();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [profileData, setProfileData] = useState({
    fullName: user?.fullName || '',
    email: user?.email || '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await apiClient.updateProfile({
        fullName: profileData.fullName,
        email: profileData.email,
      });

      await refetchUser();
      toast.success(t('profile.updateSuccessful'));
      setIsEditingProfile(false);
    } catch (error: any) {
      toast.error(apiClient.getErrorMessage(error, t('profile.updateFailed')));
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error(t('profile.passwordsDoNotMatch'));
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error(t('profile.passwordTooShort'));
      return;
    }

    setIsLoading(true);

    try {
      await apiClient.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });

      toast.success(t('profile.passwordChanged'));
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setIsChangingPassword(false);
    } catch (error: any) {
      toast.error(apiClient.getErrorMessage(error, t('profile.passwordChangeFailed')));
    } finally {
      setIsLoading(false);
    }
  };

  const passwordFields = [
    { key: 'currentPassword' as const, label: t('profile.currentPassword') },
    { key: 'newPassword' as const, label: t('profile.newPassword') },
    { key: 'confirmPassword' as const, label: t('profile.confirmNewPassword') },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('profile.title')}
        description={t('profile.description')}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Profile Picture */}
        <div className="lg:col-span-1">
          <Card className="p-6">
            <div className="flex flex-col items-center">
              <div className="relative">
                <div className="flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-4xl font-bold text-white shadow-card-hover">
                  {user?.fullName.charAt(0).toUpperCase()}
                </div>
                <button
                  aria-label={t('profile.uploadPicture')}
                  className="absolute bottom-0 right-0 rounded-full bg-primary p-2 text-primary-foreground transition-all duration-200 hover:bg-primary/90 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Camera className="h-4 w-4" />
                </button>
              </div>
              <h3 className="mt-4 text-xl font-semibold text-card-foreground">
                {user?.fullName}
              </h3>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <span className="mt-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium uppercase text-primary">
                {user?.role}
              </span>
            </div>
          </Card>
        </div>

        {/* Profile Information & Password */}
        <div className="space-y-6 lg:col-span-2">
          {/* Profile Information */}
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-card-foreground">
                {t('profile.profileInformation')}
              </h2>
              {!isEditingProfile && (
                <Button onClick={() => setIsEditingProfile(true)} size="sm">
                  {t('profile.editProfile')}
                </Button>
              )}
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-card-foreground">
                  {t('common.fullName')}
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={profileData.fullName}
                    onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
                    disabled={!isEditingProfile}
                    className={inputClasses}
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-card-foreground">
                  {t('common.email')}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    disabled={!isEditingProfile}
                    className={inputClasses}
                  />
                </div>
              </div>

              {isEditingProfile && (
                <div className="flex gap-3">
                  <Button type="submit" disabled={isLoading} loading={isLoading}>
                    <Save className="h-4 w-4" />
                    {isLoading ? t('common.saving') : t('profile.saveChanges')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isLoading}
                    onClick={() => {
                      setIsEditingProfile(false);
                      setProfileData({
                        fullName: user?.fullName || '',
                        email: user?.email || '',
                      });
                    }}
                  >
                    {t('common.cancel')}
                  </Button>
                </div>
              )}
            </form>
          </Card>

          {/* Change Password */}
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-card-foreground">
                {t('profile.changePassword')}
              </h2>
              {!isChangingPassword && (
                <Button onClick={() => setIsChangingPassword(true)} size="sm" variant="outline">
                  {t('profile.changePassword')}
                </Button>
              )}
            </div>

            {isChangingPassword ? (
              <form onSubmit={handleChangePassword} className="space-y-4">
                {passwordFields.map((field) => (
                  <div key={field.key}>
                    <label className="mb-2 block text-sm font-medium text-card-foreground">
                      {field.label}
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="password"
                        value={passwordData[field.key]}
                        onChange={(e) => setPasswordData({ ...passwordData, [field.key]: e.target.value })}
                        required
                        disabled={isLoading}
                        className={inputClasses}
                      />
                    </div>
                  </div>
                ))}

                <div className="flex gap-3">
                  <Button type="submit" disabled={isLoading} loading={isLoading}>
                    <Save className="h-4 w-4" />
                    {isLoading ? t('profile.updating') : t('profile.updatePassword')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isLoading}
                    onClick={() => {
                      setIsChangingPassword(false);
                      setPasswordData({
                        currentPassword: '',
                        newPassword: '',
                        confirmPassword: '',
                      });
                    }}
                  >
                    {t('common.cancel')}
                  </Button>
                </div>
              </form>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t('profile.securityHint')}
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}