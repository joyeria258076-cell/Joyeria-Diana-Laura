// Ruta: Frontend/src/screens/cliente/CarritoScreen.tsx
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import Loader from '../../components/Loader';
import {
    AiOutlineDelete, AiOutlineMinus, AiOutlinePlus, AiOutlineShoppingCart,
    AiOutlineShop, AiOutlineCar, AiOutlineCreditCard, AiOutlineBank, AiOutlineDollarCircle,
    AiOutlineClose, AiOutlineCheck, AiOutlineCheckCircle, AiOutlineInfoCircle, AiOutlineCalendar,
} from 'react-icons/ai';
import { useCart, cargoPersonalizacion as cargoDe, resumenOpciones } from '../../contexts/CartContext';
import { carritoAPI, apartadoAPI, recomendacionAPI, zonaEntregaAPI, type Recomendacion } from '../../services/api';
import './CarritoScreen.css';
import './CarritoApp.css';
import './HojaCompra.css';

const PLACEHOLDER = `data:image/svg+xml;utf8,<svg width="300" height="300" xmlns="http://www.w3.org/2000/svg"><rect width="300" height="300" fill="%23141414"/><g transform="translate(150,150)" stroke="%23594936" stroke-width="1.5" fill="none" opacity="0.7"><path d="M-22,-14 L22,-14 L32,-2 L0,34 L-32,-2 Z"/><path d="M-22,-14 L0,-2 L22,-14 M-32,-2 L32,-2 M0,-2 L0,34"/></g></svg>`;
const STOCK_POCO = 5;

interface MetodoPago {
    id: number;
    nombre: string;
    codigo: string;
    tipo: string;
    es_pasarela: boolean;
}

// Frase corta bajo cada método de pago en la hoja de compra
const DESC_METODO: Record<string, string> = {
    mercadopago:   'Tarjeta, OXXO o saldo Mercado Pago',
    paypal:        'Cuenta PayPal o tarjeta',
    transferencia: 'Transferencia bancaria y comprobante',
    efectivo:      'Pagas al recoger en tienda',
};

const dinero = (n: number) => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
    const { items, count, total, loading, promoNoAplica, actualizarCantidad, eliminarItem, vaciarCarrito, recargar } = useCart();

    const [recsCarrito, setRecsCarrito] = useState<Recomendacion[]>([]);
    const [zonas, setZonas] = useState<string[]>([]);
    useEffect(() => {
        zonaEntregaAPI.getAll().then((r: any) => setZonas((r?.data || []).map((z: any) => String(z.nombre || '')).filter(Boolean))).catch(() => {});
    }, []);

    // ── Estados pedido normal ─────────────────────────────────
    const [solicitando, setSolicitando]       = useState(false);
    const [pedidoExitoso, setPedidoExitoso]   = useState(false);
    const [folioPedido, setFolioPedido]       = useState('');
    const [showCheckout, setShowCheckout]     = useState(false);
    const [direccion, setDireccion]           = useState<DireccionData | null>(null);
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
                notas_cliente: '',
                metodo_pago_id: metodoPagoId,
                tipo_entrega: tipoEntrega,
                costo_envio: tipoEntrega === 'domicilio' ? costoEnvio : 0,
                direccion_data: tipoEntrega === 'domicilio' ? direccion : null
            });
            if (!data.success) throw new Error(data.message);
            setFolioPedido(data.data.folio || `#${data.data.id}`);
            setPedidoExitoso(true);
            setShowCheckout(false);
            // El backend ya pasó los productos al pedido: refrescar el carrito y el contador
            recargar();
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
            recargar();
        } catch (err: any) {
            setErrorApartado(err.message || 'Error al crear el apartado.');
        } finally {
            setSolicitandoApartado(false);
        }
    };

    // "efectivo" es exclusivo de recoger en tienda — pagarlo en tienda no tiene
    // sentido si el pedido se va a enviar a domicilio, así que se excluye para
    // evitar la combinación contradictoria (domicilio + pago en efectivo en tienda).
    const metodosDisponibles = tipoEntrega === 'domicilio'
        ? metodosPago.filter(m => m.codigo !== 'efectivo')
        : metodosPago;
    const pasarelas = metodosDisponibles.filter(m => m.es_pasarela);
    const otros     = metodosDisponibles.filter(m => !m.es_pasarela);

    // Si el cliente ya tenía "efectivo" seleccionado y cambia a domicilio,
    // se limpia la selección para forzarlo a elegir un método válido.
    useEffect(() => {
        if (tipoEntrega === 'domicilio' && metodoPagoId) {
            const actual = metodosPago.find(m => m.id === metodoPagoId);
            if (actual?.codigo === 'efectivo') setMetodoPagoId(null);
        }
    }, [tipoEntrega, metodoPagoId, metodosPago]);

    // ── Hoja de compra: estado derivado ───────────────────────
    const precioItem = (it: any) => {
        const base = Number.parseFloat(String(it.precio_promocion ?? it.precio_oferta ?? it.precio_venta));
        return base + cargoDe(it);
    };
    const ahorroPromo = Math.max(0, items.reduce((s, i) => s + Number.parseFloat(String(i.precio_venta)) * i.cantidad, 0) - total);
    const metodoSel = metodosPago.find(m => m.id === metodoPagoId) || null;
    const entregaOk = tipoEntrega === 'tienda'
        || !!(direccion && direccion.calle && direccion.colonia && direccion.codigo_postal && direccion.colonia !== '__otra__');
    const pagoOk = !!metodoSel && !(tipoEntrega === 'domicilio' && metodoSel.codigo === 'efectivo');
    const totalPedido = total + (tipoEntrega === 'domicilio' ? costoEnvio : 0);
    const minimoApartado = Math.ceil(total * 50) / 100;
    const abonoNum = Number.parseFloat(montoAbonoInicial) || 0;
    const abonoOk = abonoNum >= minimoApartado - 0.005 && abonoNum <= total + 0.005;
    const pctAbono = total > 0 ? Math.min(100, Math.round((abonoNum * 100) / total)) : 0;
    const planActual = planes.find(p => p.id === planSeleccionado) || null;
    /** Fechas y montos de los abonos según el plan (a partir de hoy). */
    const calendarioPlan = (p: { intervalo_dias: number; porcentaje_abono: number }) => {
        const saldo = Math.max(0, total - (abonoNum || minimoApartado));
        const monto = Math.round(saldo * (p.porcentaje_abono / 100));
        if (saldo <= 0 || monto <= 0) return { pagos: [] as Date[], monto: 0, ultimo: 0 };
        const n = Math.ceil(saldo / monto);
        const pagos = Array.from({ length: n }, (_, k) => new Date(Date.now() + (k + 1) * p.intervalo_dias * 86400000));
        return { pagos, monto, ultimo: saldo - monto * (n - 1) };
    };

    // Hoja abierta: Esc cierra y la página de atrás no se desplaza
    useEffect(() => {
        if (!showCheckout && !showApartado) return;
        const area = document.querySelector('.content-area') as HTMLElement | null;
        const antes = area?.style.overflow ?? '';
        if (area) area.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
        const alTeclado = (e: KeyboardEvent) => { if (e.key === 'Escape') { setShowCheckout(false); setShowApartado(false); } };
        window.addEventListener('keydown', alTeclado);
        return () => {
            if (area) area.style.overflow = antes;
            document.body.style.overflow = '';
            window.removeEventListener('keydown', alTeclado);
        };
    }, [showCheckout, showApartado]);

    // Al abrir el apartado se propone el mínimo (50%)
    useEffect(() => {
        if (showApartado && !montoAbonoInicial && total > 0) setMontoAbonoInicial((Math.ceil(total * 50) / 100).toFixed(2));
    }, [showApartado]);

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
                <span className="carrito-eyebrow">{count} {count === 1 ? 'pieza' : 'piezas'}</span>
                <h1 className="carrito-titulo">Tu <span>carrito</span></h1>
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
                        <Loader texto="Cargando carrito..." />
                    ) : (
                        items.map(item => {
                            const precioBase   = Number.parseFloat(String(item.precio_promocion ?? item.precio_oferta ?? item.precio_venta));
                            const opcionesTxt = resumenOpciones(item);
                            const esPersonalizado = !!(item.solicitud_personalizacion_id || opcionesTxt || item.talla_medida || item.nota);
                            const cargoPersonalizacion = cargoDe(item);
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
                                        {opcionesTxt && <p className="carrito-item-detalle carrito-item-opciones">{opcionesTxt}</p>}
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

            {/* ── Hoja de compra: pedido normal ─────────────── */}
            {showCheckout && createPortal(
                <div className="hc-overlay" onClick={() => setShowCheckout(false)}>
                    <div className="hc-hoja" role="dialog" aria-modal="true" aria-labelledby="hc-titulo-pedido" onClick={e => e.stopPropagation()}>
                        <header className="hc-head">
                            <div>
                                <span className="hc-eyebrow">Paso 2 de 3 · Entrega y pago</span>
                                <h2 id="hc-titulo-pedido" className="hc-titulo">Confirma tu <em>pedido</em></h2>
                            </div>
                            <button className="hc-cerrar" onClick={() => setShowCheckout(false)} aria-label="Cerrar"><AiOutlineClose size={18} /></button>
                        </header>

                        <div className="hc-cuerpo">
                            <div className="hc-pasos">
                                {/* 1. Entrega */}
                                <section className={`hc-paso${entregaOk ? ' hc-paso--ok' : ''}`}>
                                    <h3 className="hc-paso-titulo"><span className="hc-num">{entregaOk ? <AiOutlineCheck size={14} /> : '1'}</span> ¿Cómo lo recibes?</h3>
                                    <div className="hc-opciones hc-opciones--2">
                                        <button type="button" className={`hc-opcion${tipoEntrega === 'tienda' ? ' activa' : ''}`} onClick={() => setTipoEntrega('tienda')} aria-pressed={tipoEntrega === 'tienda'}>
                                            <span className="hc-opcion-icono"><AiOutlineShop size={20} /></span>
                                            <span className="hc-opcion-textos"><strong>Recoger en tienda</strong><small>Sin costo · te avisamos cuando esté lista</small></span>
                                            <span className="hc-opcion-precio hc-opcion-precio--ok">Gratis</span>
                                        </button>
                                        <button type="button" className={`hc-opcion${tipoEntrega === 'domicilio' ? ' activa' : ''}`} onClick={() => setTipoEntrega('domicilio')} aria-pressed={tipoEntrega === 'domicilio'}>
                                            <span className="hc-opcion-icono"><AiOutlineCar size={20} /></span>
                                            <span className="hc-opcion-textos"><strong>Envío a domicilio</strong><small>Por paquetería o transporte local</small></span>
                                            <span className="hc-opcion-precio">+{dinero(costoEnvio)}</span>
                                        </button>
                                    </div>
                                    {tipoEntrega === 'domicilio' ? (
                                        <div className="hc-bloque">
                                            <p className="hc-etiqueta">Dirección de envío</p>
                                            <SelectorDireccion onChange={setDireccion} />
                                            {(() => {
                                                // ¿La dirección cae en alguna zona de entrega dada de alta?
                                                if (!direccion?.colonia || !zonas.length) return null;
                                                const norm = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
                                                const donde = norm(`${direccion.colonia} ${direccion.ciudad} ${direccion.estado_dir}`);
                                                const dentro = zonas.some(z => donde.includes(norm(z)));
                                                return dentro
                                                    ? <p className="hc-nota hc-nota--ok"><AiOutlineCheckCircle size={14} /> Entregamos en tu zona.</p>
                                                    : <p className="hc-nota hc-nota--aviso"><AiOutlineInfoCircle size={14} /> Tu dirección está fuera de nuestras zonas habituales ({zonas.join(', ')}). Puedes hacer el pedido: lo enviamos por paquetería y, si el costo de envío cambia, te lo confirmamos antes de cobrar.</p>;
                                            })()}
                                            <p className="hc-nota"><AiOutlineInfoCircle size={14} /> El envío lo realiza un servicio de transporte externo, no personal de la tienda.</p>
                                        </div>
                                    ) : (
                                        <p className="hc-nota"><AiOutlineInfoCircle size={14} /> Recógelo en Calle Lázaro Cárdenas S/N, Col. El Zapote, Huejutla. Te damos un código de entrega.</p>
                                    )}
                                </section>

                                {/* 2. Pago */}
                                <section className={`hc-paso${pagoOk ? ' hc-paso--ok' : ''}`}>
                                    <h3 className="hc-paso-titulo"><span className="hc-num">{pagoOk ? <AiOutlineCheck size={14} /> : '2'}</span> ¿Cómo pagas?</h3>
                                    {cargandoMetodos ? (
                                        <div className="hc-opciones hc-opciones--2">{[0, 1, 2].map(i => <span key={i} className="hc-opcion hc-opcion--cargando" />)}</div>
                                    ) : (
                                        <div className="hc-opciones hc-opciones--2">
                                            {[...pasarelas, ...otros].map(m => (
                                                <button key={m.id} type="button" className={`hc-opcion${metodoPagoId === m.id ? ' activa' : ''}`} onClick={() => setMetodoPagoId(m.id)} aria-pressed={metodoPagoId === m.id}>
                                                    <span className="hc-opcion-icono">{ICONOS_METODO[m.codigo] || <AiOutlineCreditCard size={18} />}</span>
                                                    <span className="hc-opcion-textos"><strong>{m.nombre}</strong><small>{DESC_METODO[m.codigo] || (m.es_pasarela ? 'Pago en línea seguro' : 'Pago directo')}</small></span>
                                                    {m.es_pasarela && <span className="hc-opcion-tag">En línea</span>}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {metodoSel && (
                                        <p className="hc-nota"><AiOutlineInfoCircle size={14} /> {
                                            metodoSel.es_pasarela ? `Cuando un trabajador confirme tu pedido, te llevamos a ${metodoSel.nombre} para pagar.`
                                            : metodoSel.codigo === 'transferencia' ? 'Haz la transferencia y sube tu comprobante desde "Mis pedidos"; lo verificamos.'
                                            : metodoSel.codigo === 'efectivo' ? 'Pagas en efectivo al recoger tu pedido en la tienda.'
                                            : 'Te indicamos cómo pagar cuando confirmemos tu pedido.'
                                        }</p>
                                    )}
                                </section>

                                {/* 3. Revisión */}
                                <section className="hc-paso">
                                    <h3 className="hc-paso-titulo"><span className="hc-num">3</span> Revisa y confirma</h3>
                                    <ul className="hc-lista">
                                        <li><AiOutlineCheckCircle size={16} /> Un trabajador revisa tu pedido y te avisa por correo cuando lo confirme.</li>
                                        <li><AiOutlineCheckCircle size={16} /> No se cobra nada hasta que confirmemos que tenemos tus piezas.</li>
                                        {items.some(i => i.talla_medida || i.nota || resumenOpciones(i)) && <li><AiOutlineCheckCircle size={16} /> Las opciones de tus piezas personalizadas ya van incluidas.</li>}
                                    </ul>
                                </section>
                            </div>

                            {/* Resumen */}
                            <aside className="hc-resumen">
                                <p className="hc-etiqueta">Tu pedido · {count} {count === 1 ? 'pieza' : 'piezas'}</p>
                                <ul className="hc-piezas">
                                    {items.map(it => (
                                        <li key={it.id}>
                                            <img src={it.producto_imagen || PLACEHOLDER} alt="" onError={e => { (e.target as HTMLImageElement).src = PLACEHOLDER; }} />
                                            <span className="hc-pieza-nombre">{it.producto_nombre}<small>× {it.cantidad}{resumenOpciones(it) ? ` · ${resumenOpciones(it)}` : it.talla_medida ? ` · Talla ${it.talla_medida}` : ''}</small></span>
                                            <span className="hc-pieza-precio">{dinero(precioItem(it) * it.cantidad)}</span>
                                        </li>
                                    ))}
                                </ul>
                                <div className="hc-totales">
                                    {ahorroPromo > 0 && <div className="hc-fila hc-fila--ahorro"><span>Descuento aplicado</span><span>-{dinero(ahorroPromo)}</span></div>}
                                    <div className="hc-fila"><span>Productos</span><span>{dinero(total)}</span></div>
                                    <div className="hc-fila"><span>Entrega</span><span>{tipoEntrega === 'domicilio' ? `+${dinero(costoEnvio)}` : 'Gratis'}</span></div>
                                    <div className="hc-fila hc-fila--total"><span>Total</span><span>{dinero(totalPedido)}</span></div>
                                </div>
                                {errorMsg && <p className="hc-error">{errorMsg}</p>}
                                <button className="hc-btn" onClick={handleSolicitarPedido} disabled={solicitando || !entregaOk || !pagoOk}>
                                    {solicitando ? 'Enviando…' : !entregaOk ? 'Completa tu dirección' : !pagoOk ? 'Elige cómo pagar' : <>Confirmar pedido · {dinero(totalPedido)}</>}
                                </button>
                                <button className="hc-btn-texto" onClick={() => setShowCheckout(false)}>Seguir revisando mi carrito</button>
                            </aside>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* ── Hoja de compra: apartado ──────────────────── */}
            {showApartado && createPortal(
                <div className="hc-overlay" onClick={() => setShowApartado(false)}>
                    <div className="hc-hoja" role="dialog" aria-modal="true" aria-labelledby="hc-titulo-apartado" onClick={e => e.stopPropagation()}>
                        <header className="hc-head">
                            <div>
                                <span className="hc-eyebrow">Aparta hoy · paga en partes</span>
                                <h2 id="hc-titulo-apartado" className="hc-titulo">Aparta tus <em>piezas</em></h2>
                            </div>
                            <button className="hc-cerrar" onClick={() => setShowApartado(false)} aria-label="Cerrar"><AiOutlineClose size={18} /></button>
                        </header>

                        <div className="hc-cuerpo">
                            <div className="hc-pasos">
                                {/* 1. Abono inicial */}
                                <section className={`hc-paso${abonoOk ? ' hc-paso--ok' : ''}`}>
                                    <h3 className="hc-paso-titulo"><span className="hc-num">{abonoOk ? <AiOutlineCheck size={14} /> : '1'}</span> ¿Cuánto abonas hoy?</h3>
                                    <div className="hc-abono">
                                        <div className="hc-anillo" style={{ ['--pct' as any]: pctAbono }}>
                                            <span>{pctAbono}<small>%</small></span>
                                        </div>
                                        <div className="hc-abono-campos">
                                            <label className="hc-monto">
                                                <span>$</span>
                                                <input type="number" inputMode="decimal" min={minimoApartado} max={total} step="0.01"
                                                    placeholder={minimoApartado.toFixed(2)} value={montoAbonoInicial}
                                                    onChange={e => setMontoAbonoInicial(e.target.value)} aria-label="Abono inicial" />
                                            </label>
                                            <div className="hc-rapidos">
                                                {[50, 75, 100].map(p => (
                                                    <button key={p} type="button" className={`hc-rapido${pctAbono === p ? ' activo' : ''}`}
                                                        onClick={() => setMontoAbonoInicial((Math.ceil(total * p) / 100).toFixed(2))}>
                                                        {p === 100 ? 'Todo' : `${p}%`}
                                                    </button>
                                                ))}
                                            </div>
                                            <p className="hc-nota">{abonoNum >= total
                                                ? 'Con este abono liquidas todo de una vez.'
                                                : `Mínimo ${dinero(minimoApartado)} (50%). Te quedaría ${dinero(Math.max(0, total - (abonoNum || minimoApartado)))} por pagar.`}</p>
                                        </div>
                                    </div>
                                </section>

                                {/* 2. Plan */}
                                <section className="hc-paso">
                                    <h3 className="hc-paso-titulo"><span className="hc-num">2</span> Elige cómo liquidar <small>(opcional)</small></h3>
                                    {cargandoPlanes ? (
                                        <div className="hc-opciones">{[0, 1].map(i => <span key={i} className="hc-opcion hc-opcion--cargando" />)}</div>
                                    ) : planes.length === 0 ? (
                                        <p className="hc-nota">Por ahora no hay planes; podrás abonar cuando quieras antes de la fecha límite.</p>
                                    ) : (
                                        <div className="hc-opciones">
                                            {planes.map(p => {
                                                const cal = calendarioPlan(p);
                                                return (
                                                    <button key={p.id} type="button" className={`hc-opcion${planSeleccionado === p.id ? ' activa' : ''}`}
                                                        onClick={() => setPlanSeleccionado(planSeleccionado === p.id ? null : p.id)} aria-pressed={planSeleccionado === p.id}>
                                                        <span className="hc-opcion-icono"><AiOutlineCalendar size={18} /></span>
                                                        <span className="hc-opcion-textos">
                                                            <strong>{p.nombre}</strong>
                                                            <small>{cal.pagos.length ? `${cal.pagos.length} pago${cal.pagos.length === 1 ? '' : 's'} de ${dinero(cal.monto)} cada ${p.intervalo_dias} días` : 'Liquidas con tu abono inicial'}</small>
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                    {planActual && (() => {
                                        const cal = calendarioPlan(planActual);
                                        return cal.pagos.length > 0 && (
                                            <div className="hc-calendario">
                                                <p className="hc-etiqueta">Tu calendario de pagos</p>
                                                <ol>
                                                    <li className="hy"><span>Hoy</span><strong>{dinero(abonoNum || minimoApartado)}</strong></li>
                                                    {cal.pagos.slice(0, 6).map((f, i) => (
                                                        <li key={i}><span>{f.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</span><strong>{dinero(i === cal.pagos.length - 1 ? cal.ultimo : cal.monto)}</strong></li>
                                                    ))}
                                                    {cal.pagos.length > 6 && <li className="mas"><span>+{cal.pagos.length - 6} pagos más</span></li>}
                                                </ol>
                                            </div>
                                        );
                                    })()}
                                </section>

                                {/* 3. Pago del abono */}
                                <section className={`hc-paso${metodoPagoApartadoId ? ' hc-paso--ok' : ''}`}>
                                    <h3 className="hc-paso-titulo"><span className="hc-num">{metodoPagoApartadoId ? <AiOutlineCheck size={14} /> : '3'}</span> ¿Cómo pagas el abono?</h3>
                                    {cargandoMetodos ? (
                                        <div className="hc-opciones hc-opciones--2">{[0, 1, 2].map(i => <span key={i} className="hc-opcion hc-opcion--cargando" />)}</div>
                                    ) : (
                                        <div className="hc-opciones hc-opciones--2">
                                            {metodosPago.map(m => (
                                                <button key={m.id} type="button" className={`hc-opcion${metodoPagoApartadoId === m.id ? ' activa' : ''}`} onClick={() => setMetodoPagoApartadoId(m.id)} aria-pressed={metodoPagoApartadoId === m.id}>
                                                    <span className="hc-opcion-icono">{ICONOS_METODO[m.codigo] || <AiOutlineDollarCircle size={18} />}</span>
                                                    <span className="hc-opcion-textos"><strong>{m.nombre}</strong><small>{DESC_METODO[m.codigo] || (m.es_pasarela ? 'Pago en línea seguro' : 'Pago directo')}</small></span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    <p className="hc-nota"><AiOutlineInfoCircle size={14} /> Tus piezas quedan reservadas para ti y se recogen en tienda al liquidar.</p>
                                </section>
                            </div>

                            <aside className="hc-resumen">
                                <p className="hc-etiqueta">Vas a apartar · {count} {count === 1 ? 'pieza' : 'piezas'}</p>
                                <ul className="hc-piezas">
                                    {items.map(it => (
                                        <li key={it.id}>
                                            <img src={it.producto_imagen || PLACEHOLDER} alt="" onError={e => { (e.target as HTMLImageElement).src = PLACEHOLDER; }} />
                                            <span className="hc-pieza-nombre">{it.producto_nombre}<small>× {it.cantidad}</small></span>
                                            <span className="hc-pieza-precio">{dinero(precioItem(it) * it.cantidad)}</span>
                                        </li>
                                    ))}
                                </ul>
                                <div className="hc-totales">
                                    {ahorroPromo > 0 && <div className="hc-fila hc-fila--ahorro"><span>Descuento aplicado</span><span>-{dinero(ahorroPromo)}</span></div>}
                                    <div className="hc-fila"><span>Total de las piezas</span><span>{dinero(total)}</span></div>
                                    <div className="hc-fila"><span>Queda por pagar</span><span>{dinero(Math.max(0, total - (abonoNum || 0)))}</span></div>
                                    <div className="hc-fila hc-fila--total"><span>Pagas hoy</span><span>{dinero(abonoNum || 0)}</span></div>
                                </div>
                                {errorApartado && <p className="hc-error">{errorApartado}</p>}
                                <button className="hc-btn" onClick={handleApartar} disabled={solicitandoApartado || !abonoOk || !metodoPagoApartadoId}>
                                    {solicitandoApartado ? 'Apartando…' : !abonoOk ? `Abona al menos ${dinero(minimoApartado)}` : !metodoPagoApartadoId ? 'Elige cómo pagas el abono' : <>Apartar · pagar {dinero(abonoNum)}</>}
                                </button>
                                <button className="hc-btn-texto" onClick={() => setShowApartado(false)}>Seguir revisando mi carrito</button>
                            </aside>
                        </div>
                    </div>
                </div>,
                document.body
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