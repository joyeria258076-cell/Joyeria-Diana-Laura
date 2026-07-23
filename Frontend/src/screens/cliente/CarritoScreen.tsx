// Ruta: Frontend/src/screens/cliente/CarritoScreen.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    AiOutlineDelete, AiOutlineMinus, AiOutlinePlus, AiOutlineShoppingCart,
    AiOutlineShop, AiOutlineCar, AiOutlineCreditCard, AiOutlineBank, AiOutlineDollarCircle,
} from 'react-icons/ai';
import { useCart } from '../../contexts/CartContext';
import { carritoAPI, apartadoAPI, recomendacionAPI, type Recomendacion } from '../../services/api';
import './CarritoScreen.css';

const PLACEHOLDER = `data:image/svg+xml;utf8,<svg width="300" height="300" xmlns="http://www.w3.org/2000/svg"><rect width="300" height="300" fill="%23141414"/><g transform="translate(150,150)" stroke="%23594936" stroke-width="1.5" fill="none" opacity="0.7"><path d="M-22,-14 L22,-14 L32,-2 L0,34 L-32,-2 Z"/><path d="M-22,-14 L0,-2 L22,-14 M-32,-2 L32,-2 M0,-2 L0,34"/></g></svg>`;
const STOCK_POCO = 5;

interface MetodoPago {
    id: number;
    nombre: string;
    codigo: string;
    tipo: string;
    es_pasarela: boolean;
}

const ICONOS_METODO: Record<string, React.ReactNode> = {
    mercadopago:   <AiOutlineCreditCard size={18} />,
    paypal:        <AiOutlineCreditCard size={18} />,
    transferencia: <AiOutlineBank size={18} />,
    efectivo:      <AiOutlineDollarCircle size={18} />,
};

interface DireccionData {
    calle: string;
    numero: string;
    numero_interior?: string;
    colonia: string;
    ciudad: string;
    estado_dir: string;
    codigo_postal: string;
    referencias?: string;
    telefono_contacto?: string;
    texto_completo: string;
}

// ── Selector de dirección por CP ──────────────────────────────
const SelectorDireccion: React.FC<{ onChange: (dir: DireccionData) => void }> = ({ onChange }) => {
    const [cp, setCp]               = useState('');
    const [estado, setEstado]       = useState('');
    const [municipio, setMunicipio] = useState('');
    const [colonia, setColonia]     = useState('');
    const [colonias, setColonias]   = useState<string[]>([]);
    const [calle, setCalle]         = useState('');
    const [numero, setNumero]       = useState('');
    const [numeroInterior, setNumeroInterior] = useState('');
    const [referencias, setReferencias]       = useState('');
    const [telefono, setTelefono]             = useState('');
    const [cargando, setCargando]   = useState(false);
    const [cpValido, setCpValido]   = useState(false);
    const [cpError, setCpError]     = useState('');

    const buscarCP = async (codigo: string) => {
        if (codigo.length !== 5) {
            setEstado(''); setMunicipio(''); setColonia('');
            setColonias([]); setCpValido(false); setCpError('');
            return;
        }
        setCargando(true); setCpError('');
        try {
            const res = await fetch(`https://api.zippopotam.us/mx/${codigo}`);
            if (!res.ok) { setCpError('CP no encontrado.'); setCpValido(false); setColonias([]); return; }
            const data = await res.json();
            const places = data.places || [];
            if (!places.length) { setCpError('CP no encontrado.'); setCpValido(false); setColonias([]); return; }
            setEstado(places[0]['state'] || '');
            setMunicipio(places[0]['place name'] || '');
            if (places.length === 1) setColonia(places[0]['place name']);
            else setColonia('');
            setColonias(places.map((p: any) => p['place name']));
            setCpValido(true);
        } catch {
            setCpError('Error al buscar el CP.');
            setCpValido(false); setColonias([]);
        } finally { setCargando(false); }
    };

    const handleCpChange = (val: string) => {
        const clean = val.replace(/\D/g, '').slice(0, 5);
        setCp(clean); buscarCP(clean);
    };

    useEffect(() => {
        const partes = [
            calle && numero ? `${calle} ${numero}` : calle,
            colonia, municipio, estado, cp ? `CP ${cp}` : ''
        ].filter(Boolean);
        onChange({
            calle,
            numero,
            numero_interior: numeroInterior,
            colonia,
            ciudad: municipio,
            estado_dir: estado,
            codigo_postal: cp,
            referencias,
            telefono_contacto: telefono,
            texto_completo: partes.join(', ')
        });
    }, [cp, estado, municipio, colonia, calle, numero, numeroInterior, referencias, telefono]);

    const ic = 'carrito-dir-input';
    return (
        <div className="carrito-dir-pasos">
            <div className="carrito-dir-campo">
                <label>Código Postal <span className="carrito-requerido">*</span></label>
                <input type="text" className={ic} placeholder="Ej: 43000"
                    value={cp} onChange={e => handleCpChange(e.target.value)} maxLength={5} />
                {cargando && <span className="carrito-dir-cargando">Buscando...</span>}
                {cpValido && !cargando && <span className="carrito-cp-ok">CP encontrado — {colonias.length} colonias disponibles</span>}
                {cpError  && <span className="carrito-cp-error">{cpError}</span>}
            </div>
            {cpValido && (
                <div className="carrito-dir-fila-2">
                    <div className="carrito-dir-campo">
                        <label>Estado</label>
                        <input type="text" className={ic} value={estado} onChange={e => setEstado(e.target.value)} />
                    </div>
                    <div className="carrito-dir-campo">
                        <label>Municipio / Alcaldía</label>
                        <input type="text" className={ic} value={municipio} onChange={e => setMunicipio(e.target.value)} />
                    </div>
                </div>
            )}
            {cpValido && (
                <div className="carrito-dir-campo">
                    <label>Colonia <span className="carrito-requerido">*</span></label>
                    <select className={ic} value={colonia} onChange={e => setColonia(e.target.value)}>
                        <option value="">— Selecciona una colonia —</option>
                        {colonias.map((c, i) => <option key={i} value={c}>{c}</option>)}
                        <option value="__otra__">Mi colonia no aparece</option>
                    </select>
                    {colonia === '__otra__' && (
                        <input type="text" className={ic} style={{ marginTop: '8px' }}
                            placeholder="Escribe tu colonia"
                            onChange={e => setColonia(e.target.value === '' ? '__otra__' : e.target.value)} />
                    )}
                </div>
            )}
            {cpValido && (
                <div className="carrito-dir-fila">
                    <div className="carrito-dir-campo carrito-dir-calle">
                        <label>Calle <span className="carrito-requerido">*</span></label>
                        <input type="text" className={ic} placeholder="Nombre de la calle"
                            value={calle} onChange={e => setCalle(e.target.value)} />
                    </div>
                    <div className="carrito-dir-campo carrito-dir-num">
                        <label>Número exterior</label>
                        <input type="text" className={ic} placeholder="Ej: 123"
                            value={numero} onChange={e => setNumero(e.target.value)} />
                    </div>
                    <div className="carrito-dir-campo carrito-dir-num">
                        <label>Número interior</label>
                        <input type="text" className={ic} placeholder="Ej: Int. 4"
                            value={numeroInterior} onChange={e => setNumeroInterior(e.target.value)} />
                    </div>
                </div>
            )}
            <div className="carrito-dir-campo">
                <label>Teléfono de contacto</label>
                <input type="text" className={ic} placeholder="Ej: 7712345678"
                    value={telefono} onChange={e => setTelefono(e.target.value)} />
            </div>
            <div className="carrito-dir-campo">
                <label>Referencias (opcional)</label>
                <input type="text" className={ic} placeholder="Ej: Casa azul, frente al parque"
                    value={referencias} onChange={e => setReferencias(e.target.value)} />
            </div>
            {cpValido && calle && colonia && (
                <div className="carrito-dir-preview">
                    
                    <p>{[calle && numero ? `${calle} ${numero}` : calle, colonia, municipio, estado, `CP ${cp}`].filter(Boolean).join(', ')}</p>
                </div>
            )}
        </div>
    );
};

// ── Pantalla principal ────────────────────────────────────────
const CarritoScreen: React.FC = () => {
    const navigate = useNavigate();
    const { items, count, total, loading, promoNoAplica, actualizarCantidad, eliminarItem, vaciarCarrito } = useCart();

    const [recsCarrito, setRecsCarrito] = useState<Recomendacion[]>([]);

    // ── Estados pedido normal ─────────────────────────────────
    const [solicitando, setSolicitando]       = useState(false);
    const [pedidoExitoso, setPedidoExitoso]   = useState(false);
    const [folioPedido, setFolioPedido]       = useState('');
    const [showCheckout, setShowCheckout]     = useState(false);
    const [direccion, setDireccion]           = useState<DireccionData | null>(null);
    const [notasCliente, setNotasCliente]     = useState('');
    const [errorMsg, setErrorMsg]             = useState('');
    const [metodosPago, setMetodosPago]       = useState<MetodoPago[]>([]);
    const [metodoPagoId, setMetodoPagoId]     = useState<number | null>(null);
    const [tipoEntrega, setTipoEntrega]       = useState<'tienda' | 'domicilio'>('tienda');
    const [costoEnvio, setCostoEnvio]         = useState<number>(0);
    const [cargandoMetodos, setCargandoMetodos] = useState(false);

    // ── Estados apartado ──────────────────────────────────────
    const [showApartado, setShowApartado]               = useState(false);
    const [apartandoExitoso, setApartandoExitoso]       = useState(false);
    const [folioApartado, setFolioApartado]             = useState('');
    const [montoAbonoInicial, setMontoAbonoInicial]     = useState('');
    const [fechaLimiteApartado, setFechaLimiteApartado] = useState('');
    const [solicitandoApartado, setSolicitandoApartado] = useState(false);
    const [errorApartado, setErrorApartado]             = useState('');
    const [metodoPagoApartadoId, setMetodoPagoApartadoId] = useState<number | null>(null);
    // ── Planes de abono ───────────────────────────────────────────
    const [planes, setPlanes]               = useState<{ id: number; nombre: string; intervalo_dias: number; porcentaje_abono: number; descripcion: string }[]>([]);
    const [planSeleccionado, setPlanSeleccionado] = useState<number | null>(null);
    const [cargandoPlanes, setCargandoPlanes]     = useState(false);

    useEffect(() => {
        if (items.length === 0) { setRecsCarrito([]); return; }
        const nombres = items.map(i => i.producto_nombre);
        recomendacionAPI.recomendar(nombres).then(setRecsCarrito).catch(() => {});
    }, [items.map(i => i.id).join(',')]);

    useEffect(() => {
        if (showCheckout || showApartado) {
            cargarMetodosPago();
        }
        if (showApartado) {
            cargarPlanes();
        }
    }, [showCheckout, showApartado]);

    const cargarPlanes = async () => {
        setCargandoPlanes(true);
        try {
            const res = await apartadoAPI.getPlanes();
            if (res.success) setPlanes(res.data.filter((p: any) => p.activo));
        } catch { }
        finally { setCargandoPlanes(false); }
    };

    const cargarMetodosPago = async () => {
        setCargandoMetodos(true);
        try {
            const data = await carritoAPI.getMetodosPago();
            if (data.success) {
                setMetodosPago(data.data.metodos || []);
                if (data.data.costo_envio !== undefined) {
                    setCostoEnvio(data.data.costo_envio);
                } else {
                    setErrorMsg('No se pudo cargar el costo de envío. Intenta de nuevo.');
                }
                const mp = data.data?.metodos?.find((m: MetodoPago) => m.codigo === 'mercadopago');
                if (mp) setMetodoPagoId(mp.id);
            }
        } catch (err) { console.error(err); }
        finally { setCargandoMetodos(false); }
    };

    const handleSolicitarPedido = async () => {
        if (tipoEntrega === 'domicilio') {
            if (!direccion || !direccion.calle || !direccion.colonia || !direccion.codigo_postal) {
                setErrorMsg('Por favor completa el CP, colonia y calle'); return;
            }
            if (direccion.colonia === '__otra__') {
                setErrorMsg('Por favor escribe el nombre de tu colonia'); return;
            }
        }
        if (!metodoPagoId) {
            setErrorMsg('Por favor selecciona un método de pago'); return;
        }
        setSolicitando(true); setErrorMsg('');
        try {
            const data = await carritoAPI.crearPedido({
                direccion_envio: tipoEntrega === 'domicilio' ? direccion!.texto_completo : 'Recoger en tienda',
                notas_cliente: notasCliente,
                metodo_pago_id: metodoPagoId,
                tipo_entrega: tipoEntrega,
                costo_envio: tipoEntrega === 'domicilio' ? costoEnvio : 0,
                direccion_data: tipoEntrega === 'domicilio' ? direccion : null
            });
            if (!data.success) throw new Error(data.message);
            setFolioPedido(data.data.folio || `#${data.data.id}`);
            setPedidoExitoso(true);
            setShowCheckout(false);
        } catch (err: any) {
            setErrorMsg(err.message || 'Error al solicitar el pedido');
        } finally { setSolicitando(false); }
    };

    const handleApartar = async () => {
        if (!montoAbonoInicial || parseFloat(montoAbonoInicial) <= 0) {
            setErrorApartado('Ingresa un monto válido para el abono inicial.'); return;
        }
        if (parseFloat(montoAbonoInicial) < total * 0.5) {
            setErrorApartado(`El monto mínimo para apartar es $${(total * 0.5).toFixed(2)} (50%).`); return;
        }
        if (!metodoPagoApartadoId) {
            setErrorApartado('Selecciona un método de pago.'); return;
        }
        setSolicitandoApartado(true); setErrorApartado('');
        try {
            // Paso 1: crear pedido normal (sin dirección, tipo tienda)
            const pedidoData = await carritoAPI.crearPedido({
                direccion_envio: 'Recoger en tienda',
                notas_cliente: '(Apartado)',
                metodo_pago_id: metodoPagoApartadoId,
                tipo_entrega: 'tienda',
                costo_envio: 0,
                direccion_data: null
            });
            if (!pedidoData.success) throw new Error(pedidoData.message);

            // Paso 2: crear apartado sobre ese pedido
            const res = await apartadoAPI.crear({
                venta_id: pedidoData.data.id,
                monto_abono_inicial: parseFloat(montoAbonoInicial),
                metodo_pago_id: metodoPagoApartadoId,
                plan_abono_id: planSeleccionado || undefined
            });
            if (!res.success) throw new Error(res.message);

            setFolioApartado(res.data.folio);
            setApartandoExitoso(true);
            setShowApartado(false);
        } catch (err: any) {
            setErrorApartado(err.message || 'Error al crear el apartado.');
        } finally {
            setSolicitandoApartado(false);
        }
    };

    const pasarelas = metodosPago.filter(m => m.es_pasarela);
    const otros     = metodosPago.filter(m => !m.es_pasarela);

    // ── Pantalla éxito apartado ───────────────────────────────
    if (apartandoExitoso) {
        return (
            <main className="carrito-body">
                <div className="carrito-exito">
                    <div className="carrito-exito-icon" />
                    <h2>¡Producto apartado!</h2>
                    <p>Tu apartado <strong>{folioApartado}</strong> fue registrado correctamente.</p>
                    <p className="carrito-exito-sub">Recuerda realizar tus abonos a tiempo para no perder tu apartado.</p>
                    <div className="carrito-exito-acciones">
                        <button className="carrito-btn-primario" onClick={() => navigate('/mis-apartados')}>Ver mis apartados</button>
                        <button className="carrito-btn-secundario" onClick={() => navigate('/catalogo')}>Seguir comprando</button>
                    </div>
                </div>
            </main>
        );
    }

    // ── Pantalla éxito pedido normal ──────────────────────────
    if (pedidoExitoso) {
        return (
            <main className="carrito-body">
                <div className="carrito-exito">
                    <div className="carrito-exito-icon" />
                    <h2>¡Pedido solicitado!</h2>
                    <p>Tu pedido <strong>{folioPedido}</strong> fue recibido correctamente.</p>
                    <p className="carrito-exito-sub">Un trabajador revisará tu pedido y te notificará cuando esté confirmado.</p>
                    <div className="carrito-exito-acciones">
                        <button className="carrito-btn-primario" onClick={() => navigate('/pedidos')}>Ver mis pedidos</button>
                        <button className="carrito-btn-secundario" onClick={() => navigate('/catalogo')}>Seguir comprando</button>
                    </div>
                </div>
            </main>
        );
    }

    if (!loading && items.length === 0) {
        return (
            <main className="carrito-body">
                <div className="carrito-vacio">
                    <AiOutlineShoppingCart size={80} className="carrito-vacio-icon" />
                    <h2>Tu carrito está vacío</h2>
                    <p>Agrega productos desde el catálogo para empezar.</p>
                    <button className="carrito-btn-primario" onClick={() => navigate('/catalogo')}>Ir al catálogo</button>
                </div>
            </main>
        );
    }

    return (
        <main className="carrito-body">
            <div className="carrito-encabezado">
                <h1 className="carrito-titulo">Mi Carrito <span className="carrito-count-badge">{count}</span></h1>
                <ol className="carrito-stepper">
                    <li className="carrito-stepper-paso is-activo">
                        <span className="carrito-stepper-num">1</span>
                        <span className="carrito-stepper-label">Tu selección</span>
                    </li>
                    <li className="carrito-stepper-linea" />
                    <li className="carrito-stepper-paso">
                        <span className="carrito-stepper-num">2</span>
                        <span className="carrito-stepper-label">Entrega y pago</span>
                    </li>
                    <li className="carrito-stepper-linea" />
                    <li className="carrito-stepper-paso">
                        <span className="carrito-stepper-num">3</span>
                        <span className="carrito-stepper-label">Confirmación</span>
                    </li>
                </ol>
            </div>

            <div className="carrito-layout">
                <section className="carrito-items">
                    {loading ? (
                        <div className="carrito-loading"><div className="carrito-spinner" /><p>Cargando carrito...</p></div>
                    ) : (
                        items.map(item => {
                            const precioBase   = Number.parseFloat(String(item.precio_promocion ?? item.precio_oferta ?? item.precio_venta));
                            const esPersonalizado = !!(item.permite_personalizacion && (item.talla_medida || item.nota));
                            const cargoPersonalizacion = esPersonalizado ? Number(item.precio_personalizacion || 0) : 0;
                            const precio       = precioBase + cargoPersonalizacion;
                            const subtotal     = precio * item.cantidad;
                            const hayDescuento = precioBase < Number.parseFloat(String(item.precio_venta));
                            const pocoPoco     = item.stock_actual <= STOCK_POCO && item.stock_actual > 0;
                            const sinStock     = item.stock_actual === 0;
                            return (
                                <div key={item.id} className="carrito-item">
                                    <div className="carrito-item-imagen">
                                        <img src={item.producto_imagen || PLACEHOLDER} alt={item.producto_nombre}
                                            onError={e => { (e.target as HTMLImageElement).src = PLACEHOLDER; }} />
                                    </div>
                                    <div className="carrito-item-info">
                                        <p className="carrito-item-categoria">{item.categoria_nombre}</p>
                                        <h3 className="carrito-item-nombre">
                                            {item.producto_nombre}
                                            {esPersonalizado && <span className="carrito-badge-personalizado">Personalizado</span>}
                                        </h3>
                                        {item.talla_medida && <p className="carrito-item-detalle">Talla/Medida: <strong>{item.talla_medida}</strong></p>}
                                        {item.nota && <p className="carrito-item-detalle carrito-item-nota">{item.nota}</p>}
                                        {cargoPersonalizacion > 0 && (
                                            <p className="carrito-item-cargo">+ ${cargoPersonalizacion.toLocaleString('es-MX')} por personalización</p>
                                        )}
                                        <div className="carrito-item-precios">
                                            {hayDescuento && <span className="carrito-precio-tachado">${Number.parseFloat(String(item.precio_venta)).toLocaleString('es-MX')}</span>}
                                            <span className="carrito-precio-final">${precio.toLocaleString('es-MX')}</span>
                                        </div>
                                        {sinStock ? (
                                            <span className="carrito-stock carrito-stock-agotado">Sin stock</span>
                                        ) : pocoPoco ? (
                                            <span className="carrito-stock carrito-stock-poco">Quedan solo {item.stock_actual} unidades</span>
                                        ) : (
                                            <span className="carrito-stock carrito-stock-ok">Disponible ({item.stock_actual} en stock)</span>
                                        )}
                                    </div>
                                    <div className="carrito-item-acciones">
                                        <div className="carrito-cantidad-ctrl">
                                            <button className="carrito-qty-btn" onClick={() => actualizarCantidad(item.id, item.cantidad - 1)} disabled={item.cantidad <= 1}><AiOutlineMinus size={14} /></button>
                                            <span className="carrito-qty-num">{item.cantidad}</span>
                                            <button className="carrito-qty-btn" onClick={() => actualizarCantidad(item.id, item.cantidad + 1)} disabled={item.cantidad >= item.stock_actual}><AiOutlinePlus size={14} /></button>
                                        </div>
                                        <p className="carrito-item-subtotal">${subtotal.toLocaleString('es-MX')}</p>
                                        <button className="carrito-btn-eliminar" onClick={() => eliminarItem(item.id)} title="Eliminar"><AiOutlineDelete size={18} /></button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    {items.length > 0 && (
                        <div className="carrito-vaciar-row">
                            <button className="carrito-btn-vaciar" onClick={vaciarCarrito}>Vaciar carrito</button>
                        </div>
                    )}
                </section>

                <aside className="carrito-resumen">
                    {promoNoAplica && (
                        <div className="carrito-promo-aviso">
                            La promoción <strong>"{promoNoAplica.nombre}"</strong> requiere un mínimo de compra de <strong>${promoNoAplica.minimo.toLocaleString('es-MX')}</strong>. Agrega más productos para obtener el descuento.
                        </div>
                    )}
                    <div className="carrito-resumen-card">
                        <h3 className="carrito-resumen-titulo">Resumen del pedido</h3>
                        {(() => {
                            const totalSinPromo = items.reduce((s, i) => s + Number.parseFloat(String(i.precio_venta)) * i.cantidad, 0);
                            const ahorro = totalSinPromo - total;
                            return ahorro > 0 ? (
                                <>
                                    <div className="carrito-resumen-fila" style={{textDecoration:'line-through', opacity:0.5}}><span>Precio normal</span><span>${totalSinPromo.toLocaleString('es-MX')}</span></div>
                                    <div className="carrito-resumen-fila" style={{color:'#e8d5b7', fontWeight:600}}><span>Descuento promo</span><span>-${ahorro.toLocaleString('es-MX')}</span></div>
                                </>
                            ) : null;
                        })()}
                        <div className="carrito-resumen-fila"><span>Productos ({count})</span><span>${total.toLocaleString('es-MX')}</span></div>
                        <div className="carrito-resumen-fila"><span>Envío</span><span className="carrito-envio-texto">Por confirmar</span></div>
                        <div className="carrito-resumen-divider" />
                        <div className="carrito-resumen-fila carrito-resumen-total"><span>Total estimado</span><span>${total.toLocaleString('es-MX')}</span></div>
                        <button className="carrito-btn-primario carrito-btn-checkout"
                            onClick={() => setShowCheckout(true)}
                            disabled={items.length === 0}>
                            Solicitar pedido →
                        </button>
                        <button className="carrito-btn-apartado"
                            onClick={() => { setShowApartado(true); cargarMetodosPago(); }}
                            disabled={items.length === 0}>
                            Apartar (50% ahora)
                        </button>
                        <p className="carrito-resumen-nota">Un trabajador revisará tu pedido antes de confirmar el pago.</p>
                        <p className="carrito-apartado-nota">Aparta tus productos pagando el 50% y liquida el resto en cómodas parcialidades.</p>
                    </div>
                </aside>
            </div>

            {/* ── Modal checkout normal ─────────────────────── */}
            {showCheckout && (
                <div className="carrito-modal-overlay" onClick={() => setShowCheckout(false)}>
                    <div className="carrito-modal carrito-modal-grande" onClick={e => e.stopPropagation()}>
                        <div className="carrito-modal-header">
                            <h2>Datos del pedido</h2>
                            <button className="carrito-modal-close" onClick={() => setShowCheckout(false)}>×</button>
                        </div>
                        <div className="carrito-modal-body">
                            <div className="carrito-checkout-guia">
                                <div className="carrito-guia-paso"><span className="carrito-guia-num">1</span><span>¿Cómo recibes tu pedido?</span></div>
                                <div className="carrito-guia-sep">→</div>
                                <div className="carrito-guia-paso"><span className="carrito-guia-num">2</span><span>Elige tu método de pago</span></div>
                                <div className="carrito-guia-sep">→</div>
                                <div className="carrito-guia-paso"><span className="carrito-guia-num">3</span><span>Confirma tu pedido</span></div>
                            </div>
                            <div className="carrito-form-group">
                                <label>¿Cómo quieres recibir tu pedido? <span className="carrito-requerido">*</span></label>
                                <div className="carrito-metodos-opciones">
                                    <label className={`carrito-metodo-opcion ${tipoEntrega === 'tienda' ? 'seleccionado' : ''}`}>
                                        <input type="radio" name="tipo_entrega" value="tienda"
                                            checked={tipoEntrega === 'tienda'}
                                            onChange={() => setTipoEntrega('tienda')} />
                                        <span className="carrito-metodo-icono"><AiOutlineShop size={18} /></span>
                                        <span className="carrito-metodo-nombre">Recoger en tienda <small className="carrito-metodo-nota carrito-metodo-nota--ok">(Sin costo)</small></span>
                                    </label>
                                    <label className={`carrito-metodo-opcion ${tipoEntrega === 'domicilio' ? 'seleccionado' : ''}`}>
                                        <input type="radio" name="tipo_entrega" value="domicilio"
                                            checked={tipoEntrega === 'domicilio'}
                                            onChange={() => setTipoEntrega('domicilio')} />
                                        <span className="carrito-metodo-icono"><AiOutlineCar size={18} /></span>
                                        <span className="carrito-metodo-nombre">Envío a domicilio <small className="carrito-metodo-nota">(+${costoEnvio.toLocaleString('es-MX')} MXN)</small></span>
                                    </label>
                                </div>
                            </div>
                            {tipoEntrega === 'domicilio' ? (
                                <div className="carrito-form-group">
                                    <label>Dirección de envío <span className="carrito-requerido">*</span></label>
                                    <SelectorDireccion onChange={setDireccion} />
                                </div>
                            ) : (
                                <div className="carrito-metodo-info">
                                    <strong>Recoger en tienda:</strong> Te avisaremos cuando tu pedido esté listo. Preséntate en nuestra sucursal con tu código de entrega.
                                </div>
                            )}
                            <div className="carrito-form-group">
                                <label>Método de pago <span className="carrito-requerido">*</span></label>
                                {cargandoMetodos ? (
                                    <div className="carrito-dir-cargando">Cargando métodos de pago...</div>
                                ) : (
                                    <div className="carrito-metodos-pago">
                                        {pasarelas.length > 0 && (
                                            <div className="carrito-metodos-grupo">
                                                <p className="carrito-metodos-titulo">Pago en línea</p>
                                                <div className="carrito-metodos-opciones">
                                                    {pasarelas.map(m => (
                                                        <label key={m.id} className={`carrito-metodo-opcion ${metodoPagoId === m.id ? 'seleccionado' : ''}`}>
                                                            <input type="radio" name="metodo_pago" value={m.id}
                                                                checked={metodoPagoId === m.id}
                                                                onChange={() => setMetodoPagoId(m.id)} />
                                                            <span className="carrito-metodo-icono">{ICONOS_METODO[m.codigo] || <AiOutlineCreditCard size={18} />}</span>
                                                            <span className="carrito-metodo-nombre">{m.nombre}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {otros.length > 0 && (
                                            <div className="carrito-metodos-grupo">
                                                <p className="carrito-metodos-titulo">Otros métodos</p>
                                                <div className="carrito-metodos-opciones">
                                                    {otros.map(m => (
                                                        <label key={m.id} className={`carrito-metodo-opcion ${metodoPagoId === m.id ? 'seleccionado' : ''}`}>
                                                            <input type="radio" name="metodo_pago" value={m.id}
                                                                checked={metodoPagoId === m.id}
                                                                onChange={() => setMetodoPagoId(m.id)} />
                                                            <span className="carrito-metodo-icono">{ICONOS_METODO[m.codigo] || <AiOutlineDollarCircle size={18} />}</span>
                                                            <span className="carrito-metodo-nombre">{m.nombre}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {metodoPagoId && (() => {
                                            const m = metodosPago.find(x => x.id === metodoPagoId);
                                            if (!m) return null;
                                            if (m.es_pasarela) return (
                                                <div className="carrito-metodo-info">
                                                    Serás redirigido a <strong>{m.nombre}</strong> para completar el pago después de que el trabajador confirme tu pedido.
                                                </div>
                                            );
                                            if (m.codigo === 'transferencia') return (
                                                <div className="carrito-metodo-info">
                                                    Deberás realizar una transferencia bancaria y subir tu comprobante. El trabajador verificará el pago.
                                                </div>
                                            );
                                            if (m.codigo === 'efectivo') return (
                                                <div className="carrito-metodo-info">
                                                    Podrás pagar en efectivo al momento de la entrega o en nuestra tienda.
                                                </div>
                                            );
                                            return null;
                                        })()}
                                    </div>
                                )}
                            </div>
                            <div className="carrito-form-group">
                                <label>Notas e instrucciones para tu pedido (opcional)</label>
                                <textarea rows={3}
                                    placeholder="Ej: talla del anillo 7, grabado con nombre 'Ana', color preferido..."
                                    value={notasCliente} onChange={e => setNotasCliente(e.target.value)}
                                    className="carrito-textarea" />
                                <small className="carrito-form-ayuda">¿Necesitas alguna personalización, talla específica o tienes alguna indicación para tu pedido? Escríbela aquí.</small>
                            </div>
                            {errorMsg && <div className="carrito-error-msg">{errorMsg}</div>}
                            <div className="carrito-modal-resumen">
                                {(() => {
                                    const totalSinPromo = items.reduce((s, i) => s + Number.parseFloat(String(i.precio_venta)) * i.cantidad, 0);
                                    const ahorro = totalSinPromo - total;
                                    return ahorro > 0 ? (
                                        <div className="carrito-resumen-fila" style={{color:'#e8d5b7', fontSize:'0.85rem'}}>
                                            <span>Descuento aplicado</span><span>-${ahorro.toLocaleString('es-MX')}</span>
                                        </div>
                                    ) : null;
                                })()}
                                <div className="carrito-resumen-fila">
                                    <span>Productos ({count})</span>
                                    <span>${total.toLocaleString('es-MX')}</span>
                                </div>
                                {tipoEntrega === 'domicilio' && (
                                    <div className="carrito-resumen-fila">
                                        <span>Envío a domicilio</span>
                                        <span>+${costoEnvio.toLocaleString('es-MX')}</span>
                                    </div>
                                )}
                                <div className="carrito-resumen-fila" style={{fontWeight:700}}>
                                    <span>Total</span>
                                    <strong>${(total + (tipoEntrega === 'domicilio' ? costoEnvio : 0)).toLocaleString('es-MX')}</strong>
                                </div>
                            </div>
                        </div>
                        <div className="carrito-modal-footer">
                            <button className="carrito-btn-secundario" onClick={() => setShowCheckout(false)}>Cancelar</button>
                            <button className="carrito-btn-primario" onClick={handleSolicitarPedido} disabled={solicitando}>
                                {solicitando ? 'Enviando...' : 'Confirmar pedido'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal apartado ────────────────────────────── */}
            {showApartado && (
                <div className="carrito-modal-overlay" onClick={() => setShowApartado(false)}>
                    <div className="carrito-modal carrito-modal-grande" onClick={e => e.stopPropagation()}>
                        <div className="carrito-modal-header">
                            <h2>Apartar productos</h2>
                            <button className="carrito-modal-close" onClick={() => setShowApartado(false)}>×</button>
                        </div>
                        <div className="carrito-modal-body">
                            <div className="carrito-apartado-info">
                                <p>Al apartar, el <strong>50% mínimo</strong> se cobra ahora y el stock queda reservado para ti.</p>
                            </div>
                            <div className="carrito-modal-resumen">
                                {(() => {
                                    const totalSinPromo = items.reduce((s, i) => s + Number.parseFloat(String(i.precio_venta)) * i.cantidad, 0);
                                    const ahorro = totalSinPromo - total;
                                    return ahorro > 0 ? (
                                        <>
                                            <div className="carrito-resumen-fila" style={{opacity:0.5, textDecoration:'line-through', fontSize:'0.85rem'}}>
                                                <span>Precio original</span><span>${totalSinPromo.toLocaleString('es-MX')}</span>
                                            </div>
                                            <div className="carrito-resumen-fila" style={{color:'#e8d5b7', fontSize:'0.85rem', fontWeight:600}}>
                                                <span>Descuento aplicado</span><span>-${ahorro.toLocaleString('es-MX')}</span>
                                            </div>
                                        </>
                                    ) : null;
                                })()}
                                <div className="carrito-resumen-fila" style={{fontWeight:700}}>
                                    <span>Total del pedido</span>
                                    <span>${total.toLocaleString('es-MX')}</span>
                                </div>
                                <div className="carrito-resumen-fila" style={{ color: '#e8d5b7' }}>
                                    <span>Mínimo para apartar (50%)</span>
                                    <span>${(total * 0.5).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                            <div className="carrito-form-group">
                                <label>Abono inicial <span className="carrito-requerido">*</span></label>
                                <input
                                    type="number"
                                    className="carrito-dir-input"
                                    placeholder={`Mínimo $${(total * 0.5).toFixed(2)}`}
                                    min={total * 0.5}
                                    max={total}
                                    value={montoAbonoInicial}
                                    onChange={e => setMontoAbonoInicial(e.target.value)}
                                />
                                <small className="carrito-form-ayuda">Puedes pagar más del 50% si lo deseas.</small>
                            </div>
                            {/* ── Plan de abono ── */}
                            <div className="carrito-form-group">
                                <label>Plan de pagos (opcional)</label>
                                {cargandoPlanes ? (
                                    <div className="carrito-dir-cargando">Cargando planes...</div>
                                ) : planes.length === 0 ? (
                                    <p className="carrito-form-ayuda">No hay planes disponibles por el momento.</p>
                                ) : (
                                    <>
                                        <div className="carrito-planes-opciones">
                                            {planes.map(p => {
                                                const abonoIni     = parseFloat(montoAbonoInicial) || total * 0.5;
                                                const saldoRest    = Math.max(0, total - abonoIni);
                                                const montoPorAbono = Math.round(saldoRest * (p.porcentaje_abono / 100));
                                                const numPagos     = montoPorAbono > 0 ? Math.ceil(saldoRest / montoPorAbono) : '—';
                                                return (
                                                    <label key={p.id} className={`carrito-plan-opcion ${planSeleccionado === p.id ? 'seleccionado' : ''}`}>
                                                        <input type="radio" name="plan_abono"
                                                            checked={planSeleccionado === p.id}
                                                            onChange={() => setPlanSeleccionado(p.id)} />
                                                        <div className="carrito-plan-info">
                                                            <span className="carrito-plan-nombre">{p.nombre}</span>
                                                            <span className="carrito-plan-desc">
                                                                ${typeof montoPorAbono === 'number' ? montoPorAbono.toLocaleString('es-MX') : '—'} cada {p.intervalo_dias} días
                                                                · {numPagos} pago{numPagos !== 1 ? 's' : ''} para liquidar
                                                            </span>
                                                        </div>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                        {planSeleccionado && (() => {
                                            const plan     = planes.find(p => p.id === planSeleccionado);
                                            if (!plan) return null;
                                            const abono    = parseFloat(montoAbonoInicial) || total * 0.5;
                                            const saldo    = Math.max(0, total - abono);
                                            const montoPag = Math.round(saldo * (plan.porcentaje_abono / 100));
                                            const numPagos = montoPag > 0 ? Math.ceil(saldo / montoPag) : 0;
                                            return (
                                                <div className="carrito-plan-preview">
                                                    <p><strong>Tu calendario de pagos:</strong></p>
                                                    <p>Abono inicial ahora: <strong>${abono.toLocaleString('es-MX')}</strong></p>
                                                    {saldo <= 0
                                                        ? <p style={{ color: '#e8d5b7' }}>Con este abono liquidas el apartado completo.</p>
                                                        : <p>Luego: <strong>{numPagos} pago{numPagos !== 1 ? 's' : ''}</strong> de <strong>${montoPag.toLocaleString('es-MX')}</strong> cada <strong>{plan.intervalo_dias} días</strong></p>
                                                    }
                                                </div>
                                            );
                                        })()}
                                    </>
                                )}
                            </div>
                            <div className="carrito-form-group">
                                <label>Método de pago del abono inicial <span className="carrito-requerido">*</span></label>
                                {cargandoMetodos ? (
                                    <div className="carrito-dir-cargando">Cargando métodos de pago...</div>
                                ) : (
                                    <div className="carrito-metodos-opciones">
                                        {metodosPago.map(m => (
                                            <label key={m.id} className={`carrito-metodo-opcion ${metodoPagoApartadoId === m.id ? 'seleccionado' : ''}`}>
                                                <input type="radio" name="metodo_apartado"
                                                    checked={metodoPagoApartadoId === m.id}
                                                    onChange={() => setMetodoPagoApartadoId(m.id)} />
                                                <span className="carrito-metodo-icono">{ICONOS_METODO[m.codigo] || <AiOutlineDollarCircle size={18} />}</span>
                                                <span className="carrito-metodo-nombre">{m.nombre}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {errorApartado && <div className="carrito-error-msg">{errorApartado}</div>}
                        </div>
                        <div className="carrito-modal-footer">
                            <button className="carrito-btn-secundario" onClick={() => setShowApartado(false)}>Cancelar</button>
                            <button className="carrito-btn-primario" onClick={handleApartar} disabled={solicitandoApartado}>
                                {solicitandoApartado ? 'Apartando...' : 'Confirmar apartado'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {recsCarrito.length > 0 && (
                <section className="carrito-recs">
                    <div className="carrito-recs-inner">
                        <h3 className="carrito-recs-titulo">Productos similares que podrían interesarte</h3>
                        <ul className="carrito-recs-lista">
                            {recsCarrito.map((r, i) => (
                                <li
                                    key={i}
                                    className="carrito-recs-card"
                                    onClick={() => r.id ? navigate(`/producto/${r.id}`) : navigate(`/catalogo?buscar=${encodeURIComponent(r.nombre)}`)}
                                >
                                    <div className="carrito-recs-card-img">
                                        <img src={r.imagen_url || PLACEHOLDER} alt={r.nombre} loading="lazy"
                                            onError={e => { (e.target as HTMLImageElement).src = PLACEHOLDER; }} />
                                    </div>
                                    <div className="carrito-recs-card-info">
                                        <span className="carrito-recs-card-nombre">{r.nombre}</span>
                                        {r.precio_venta != null && (
                                            <span className="carrito-recs-card-precio">${r.precio_venta.toFixed(2)}</span>
                                        )}
                                    </div>
                                    <span className="rec-arrow">→</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </section>
            )}
        </main>
    );
};

export default CarritoScreen;