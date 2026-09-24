import React from "react";
import PublicHeader from "../../components/PublicHeader";
import PublicFooter from "../../components/PublicFooter";
import ContactoContenido from "../../components/ContactoContenido";

const ContactoPublicScreen: React.FC = () => (
  <div className="sx-page">
    <PublicHeader />
    <ContactoContenido />
    <PublicFooter />
  </div>
);

export default ContactoPublicScreen;
