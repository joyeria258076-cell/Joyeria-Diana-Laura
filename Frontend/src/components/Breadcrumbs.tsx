import React from "react";
import { Link, useLocation } from "react-router-dom";
import "../styles/Breadcrumbs.css";

const Breadcrumbs: React.FC = () => {
    const location = useLocation();
    const pathnames = location.pathname.split("/").filter((x) => x);

    return (
        <nav className="breadcrumbs-nav">
            <Link to="/inicio">Inicio</Link>
            {pathnames.map((name, index) => {
                const routeTo = `/${pathnames.slice(0, index + 1).join("/")}`;
                const isLast = index === pathnames.length - 1;

                return (
                    <span key={name}>
                        <span className="separator"> / </span>
                        {isLast ? (
                            <span className="current-page">{name}</span>
                        ) : (
                            <Link to={routeTo}>{name}</Link>
                        )}
                    </span>
                );
            })}
        </nav>
    );
};

export default Breadcrumbs;