import React from 'react';
import { trackWhatsAppClick } from '../analytics';

interface WhatsAppButtonProps {
  label: string;
  location: string;
  className?: string;
}

const WHATSAPP_LINK = 'https://api.whatsapp.com/send/?phone=919303259841&text=Hi+I+want+to+know+about+Proprupee+Funded+Account&type=phone_number&app_absent=0';

export const WhatsAppButton: React.FC<WhatsAppButtonProps> = ({ label, location, className = '' }) => {
  const handleClick = () => {
    trackWhatsAppClick(location);
    window.open(WHATSAPP_LINK, '_blank', 'noopener,noreferrer');
  };
  return (
    <button
      type="button"
      onClick={handleClick}
      className={`whatsapp-button ${className}`}
    >
      {label}
    </button>
  );
};

export default WhatsAppButton;
