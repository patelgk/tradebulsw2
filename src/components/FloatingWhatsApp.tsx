import React from 'react';
import { Phone } from 'lucide-react';
import WhatsAppButton from './WhatsAppButton';

const FloatingWhatsApp: React.FC = () => {
  return (
    <div className="whatsapp-float">
      <WhatsAppButton
        label={<Phone className="w-6 h-6" />}
        location="floating"
        className="bg-whatsapp-green text-white rounded-full flex items-center justify-center w-14 h-14 shadow-lg hover:shadow-xl transition-shadow"
      />
    </div>
  );
};

export default FloatingWhatsApp;
