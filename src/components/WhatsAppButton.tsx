import React from 'react';


interface WhatsAppButtonProps {
  label: string;
  location: string;
  className?: string;
}

const WHATSAPP_LINK = 'https://api.whatsapp.com/send/?phone=919303259841&text=Hi+I+want+to+know+about+Proprupee+Funded+Account&type=phone_number&app_absent=0';

export const WhatsAppButton: React.FC<WhatsAppButtonProps> = ({ label, location, className = '' }) => {
  const handleClick = () => {
    console.log("WhatsApp Click:", location);
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
