import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Check, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  Smile
} from 'lucide-react';
import { Modal } from '../Modal/Modal';
import { useAuth } from '../../context/AuthContext';
import { 
  MALE_AVATARS, 
  FEMALE_AVATARS, 
  getDefaultAvatar, 
  getAvatarById, 
  resolveAvatarUrl,
  type AvatarGender,
  type CuratedAvatar
} from '../../utils/avatarUtils';
import type { UserProfile } from '../../types';
import './UserProfileModal.css';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ 
  isOpen, 
  onClose,
  onSuccess 
}) => {
  const { currentUser, userProfile, updateUserProfile } = useAuth();

  // Form States
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  
  // Avatar selection state
  const [avatarGender, setAvatarGender] = useState<AvatarGender>('male');
  const [selectedAvatarId, setSelectedAvatarId] = useState<string>('male-1');
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string>('');

  // UI States
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; mobileNumber?: string }>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Pre-populate fields on open or when profile loads
  useEffect(() => {
    if (isOpen) {
      setValidationError(null);
      setFieldErrors({});
      setSuccessMessage(null);

      const initialFullName = userProfile?.fullName || currentUser?.displayName || '';
      const initialEmail = userProfile?.email || currentUser?.email || '';
      const initialMobile = userProfile?.mobileNumber || currentUser?.phoneNumber || '';
      const initialDob = userProfile?.dateOfBirth || '';

      const initialGender: AvatarGender = userProfile?.avatarGender || 'male';
      const initialAvatarId = userProfile?.avatarId || (initialGender === 'female' ? 'female-1' : 'male-1');
      const initialPhotoUrl = userProfile?.photoURL || resolveAvatarUrl(initialAvatarId, currentUser?.photoURL || undefined, initialGender);

      setFullName(initialFullName);
      setEmail(initialEmail);
      setMobileNumber(initialMobile);
      setDateOfBirth(initialDob);
      setAvatarGender(initialGender);
      setSelectedAvatarId(initialAvatarId);
      setPreviewPhotoUrl(initialPhotoUrl);
    }
  }, [isOpen, userProfile, currentUser]);

  // Handle switching gender tab
  const handleGenderToggle = (gender: AvatarGender) => {
    setAvatarGender(gender);
    // Switch to default avatar of that gender if current avatar does not match gender
    const defaultForGender = getDefaultAvatar(gender);
    setSelectedAvatarId(defaultForGender.id);
    setPreviewPhotoUrl(defaultForGender.url);
  };

  // Handle selecting an avatar from the grid
  const handleAvatarSelect = (avatar: CuratedAvatar) => {
    setSelectedAvatarId(avatar.id);
    setPreviewPhotoUrl(avatar.url);
  };

  // Validation function
  const validateForm = (): boolean => {
    const errors: { email?: string; mobileNumber?: string } = {};
    const trimmedEmail = email.trim();
    const trimmedMobile = mobileNumber.trim();

    // Mandatory checks
    if (!trimmedEmail && !trimmedMobile) {
      setValidationError('Mobile number and email address are required');
      errors.email = 'Email address is required';
      errors.mobileNumber = 'Mobile number is required';
      setFieldErrors(errors);
      return false;
    }

    if (!trimmedEmail) {
      setValidationError('Email address is required');
      errors.email = 'Email address is required';
      setFieldErrors(errors);
      return false;
    }

    if (!trimmedMobile) {
      setValidationError('Mobile number is required');
      errors.mobileNumber = 'Mobile number is required';
      setFieldErrors(errors);
      return false;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setValidationError('Please enter a valid email address');
      errors.email = 'Invalid email address format';
      setFieldErrors(errors);
      return false;
    }

    // Mobile number basic validation (at least 7 characters/digits)
    const phoneClean = trimmedMobile.replace(/[\s\-\(\)\+]/g, '');
    if (phoneClean.length < 7 || !/^\d+$/.test(phoneClean)) {
      setValidationError('Please enter a valid mobile number with at least 7 digits');
      errors.mobileNumber = 'Invalid phone number';
      setFieldErrors(errors);
      return false;
    }

    setValidationError(null);
    setFieldErrors({});
    return true;
  };

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setValidationError(null);
      setSuccessMessage(null);

      // Determine final avatar URL
      const finalAvatar = getAvatarById(selectedAvatarId);
      const finalPhotoUrl = finalAvatar ? finalAvatar.url : previewPhotoUrl || resolveAvatarUrl(selectedAvatarId, undefined, avatarGender);

      const profilePayload: Partial<UserProfile> = {
        fullName: fullName.trim(),
        email: email.trim(),
        mobileNumber: mobileNumber.trim(),
        dateOfBirth: dateOfBirth || '',
        avatarGender,
        avatarId: selectedAvatarId,
        photoURL: finalPhotoUrl
      };

      await updateUserProfile(profilePayload);

      setSuccessMessage('Profile updated successfully!');
      
      if (onSuccess) {
        onSuccess();
      }

      // Close after brief success indicator
      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err: any) {
      console.error('Failed to update profile:', err);
      setValidationError(err.message || 'An error occurred while saving your profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const activeAvatarsList = avatarGender === 'male' ? MALE_AVATARS : FEMALE_AVATARS;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !loading && onClose()}
      title="User Profile Management"
      size="md"
    >
      <form onSubmit={handleSubmit} className="profile-modal-body" noValidate>
        {/* Live Profile Preview Card */}
        <div className="profile-preview-card">
          <div className="profile-preview-avatar-wrapper">
            <img 
              src={previewPhotoUrl || resolveAvatarUrl(selectedAvatarId, undefined, avatarGender)} 
              alt="Avatar Preview" 
              className="profile-preview-avatar" 
            />
            <div className="profile-preview-badge" title="Selected Avatar">
              <Check size={14} />
            </div>
          </div>
          <h4 className="profile-preview-name">
            {fullName.trim() || currentUser?.displayName || 'User'}
          </h4>
          <span className="profile-preview-email">
            {email.trim() || currentUser?.email || 'user@example.com'}
          </span>
        </div>

        {/* Avatar Selection Section */}
        <div className="avatar-selection-section">
          <div className="avatar-section-header">
            <span className="avatar-section-title">
              <Smile size={18} color="var(--accent-primary)" />
              Choose Profile Avatar
            </span>

            {/* Gender Toggle Pill Control */}
            <div className="gender-toggle-group">
              <button
                type="button"
                className={`gender-toggle-btn ${avatarGender === 'male' ? 'active' : ''}`}
                onClick={() => handleGenderToggle('male')}
              >
                <span>Male</span>
              </button>
              <button
                type="button"
                className={`gender-toggle-btn ${avatarGender === 'female' ? 'active' : ''}`}
                onClick={() => handleGenderToggle('female')}
              >
                <span>Female</span>
              </button>
            </div>
          </div>

          {/* Curated Avatars Grid */}
          <div className="curated-avatars-grid">
            {activeAvatarsList.map((avatar) => {
              const isSelected = selectedAvatarId === avatar.id;
              return (
                <div
                  key={avatar.id}
                  className={`curated-avatar-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleAvatarSelect(avatar)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleAvatarSelect(avatar);
                    }
                  }}
                  title={avatar.label}
                >
                  <img src={avatar.url} alt={avatar.label} className="curated-avatar-img" />
                  {isSelected && (
                    <div className="curated-avatar-check">
                      <Check size={11} strokeWidth={3} />
                    </div>
                  )}
                  <span className="curated-avatar-label">{avatar.label.split(' ')[0]}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Feedback Alert Banners */}
        {validationError && (
          <div className="profile-alert-banner error">
            <AlertCircle size={18} className="profile-alert-icon" />
            <span>{validationError}</span>
          </div>
        )}

        {successMessage && (
          <div className="profile-alert-banner success">
            <CheckCircle2 size={18} className="profile-alert-icon" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Profile Form Fields */}
        <div className="profile-form-grid">
          {/* Full Name */}
          <div className="form-group profile-field-full">
            <label className="form-label" htmlFor="profile-fullName">
              Full Name
            </label>
            <div className="input-with-icon">
              <User size={16} className="input-icon-left" />
              <input
                id="profile-fullName"
                type="text"
                className="form-input has-icon"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          {/* Email Address (Mandatory) */}
          <div className="form-group">
            <label className="form-label" htmlFor="profile-email">
              Email Address <span className="field-label-required">*</span>
            </label>
            <div className="input-with-icon">
              <Mail size={16} className="input-icon-left" />
              <input
                id="profile-email"
                type="email"
                className={`form-input has-icon ${fieldErrors.email ? 'error' : ''}`}
                placeholder="name@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) {
                    setFieldErrors(prev => ({ ...prev, email: undefined }));
                  }
                }}
                disabled={loading}
                required
              />
            </div>
            {fieldErrors.email && (
              <span className="field-error-text">
                <AlertCircle size={12} /> {fieldErrors.email}
              </span>
            )}
          </div>

          {/* Mobile Number (Mandatory) */}
          <div className="form-group">
            <label className="form-label" htmlFor="profile-mobile">
              Mobile Number <span className="field-label-required">*</span>
            </label>
            <div className="input-with-icon">
              <Phone size={16} className="input-icon-left" />
              <input
                id="profile-mobile"
                type="tel"
                className={`form-input has-icon ${fieldErrors.mobileNumber ? 'error' : ''}`}
                placeholder="+91 98765 43210"
                value={mobileNumber}
                onChange={(e) => {
                  setMobileNumber(e.target.value);
                  if (fieldErrors.mobileNumber) {
                    setFieldErrors(prev => ({ ...prev, mobileNumber: undefined }));
                  }
                }}
                disabled={loading}
                required
              />
            </div>
            {fieldErrors.mobileNumber && (
              <span className="field-error-text">
                <AlertCircle size={12} /> {fieldErrors.mobileNumber}
              </span>
            )}
          </div>

          {/* Date of Birth (Date Picker) */}
          <div className="form-group profile-field-full">
            <label className="form-label" htmlFor="profile-dob">
              Date of Birth
            </label>
            <div className="input-with-icon">
              <Calendar size={16} className="input-icon-left" />
              <input
                id="profile-dob"
                type="date"
                className="form-input has-icon"
                value={dateOfBirth}
                max={new Date().toISOString().split('T')[0]} // prevent future dates
                onChange={(e) => setDateOfBirth(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="profile-modal-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="btn-spinner" />
                <span>Saving...</span>
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
