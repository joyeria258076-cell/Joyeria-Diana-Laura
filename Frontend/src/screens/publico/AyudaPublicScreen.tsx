import React from "react";
import PublicHeader from "../../components/PublicHeader";
import PublicFooter from "../../components/PublicFooter";
import AyudaContenido from "../../components/AyudaContenido";

const AyudaPublicScreen: React.FC = () => (
  <div className="sx-page">
    <PublicHeader />
    <AyudaContenido />
    <PublicFooter />
  </div>
);

export default AyudaPublicScreen;
