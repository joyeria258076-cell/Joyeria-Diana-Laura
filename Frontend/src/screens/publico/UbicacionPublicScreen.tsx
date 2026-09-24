import React from "react";
import PublicHeader from "../../components/PublicHeader";
import PublicFooter from "../../components/PublicFooter";
import UbicacionContenido from "../../components/UbicacionContenido";

const UbicacionPublicScreen: React.FC = () => (
  <div className="sx-page">
    <PublicHeader />
    <UbicacionContenido />
    <PublicFooter />
  </div>
);

export default UbicacionPublicScreen;
