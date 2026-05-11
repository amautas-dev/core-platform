# Documentación de Negocio - Distali Admin

Esta documentación describe la **lógica de negocio** incorporada en la aplicación: reglas, flujos, estados, cálculos y validaciones que definen el comportamiento del sistema desde el punto de vista funcional.

---

## 1. Roles y permisos

- **idRol 1**: Admin – acceso completo.
- **idRol 2**: Gestión – administración operativa.
- **idRol 3**: Vendedor – clientes y pedidos asignados.
- **idRol 4**: Repartidor – entregas y distribución.
- **idRol 5**: Mixto – se redirige al dashboard de vendedor; combina capacidades vendedor/repartidor.

El menú y las acciones visibles dependen de **permisos por rol** (tabla/funcionalidad). La directiva `hasPermission` y el `PermissionService` ocultan o deshabilitan opciones según el usuario.

**Admin (rol 1 o 2)**: en “Registrar entrega”, solo los admin pueden **editar el precio unitario** de los productos en la grilla; el resto solo lo ve en solo lectura.

---

## 2. Clientes

### 2.1 Datos principales

- Cliente pertenece a una **zona** (`idZona`) y puede tener **vendedor** asignado (relación Cliente–Vendedor).
- **Cuenta corriente**: `usaCuentaCorriente`. Si es `true`, el cliente puede quedar debiendo (saldo a favor de la empresa); si es `false`, al registrar entrega debe pagar al menos el total del pedido.
- **Precio costo**: `usaPrecioCosto` indica si se usa precio de costo en listas/precios para ese cliente.
- **Ubicación**: `latitud`, `longitud` para mapa y orden de ruta.
- **Orden**: campo `orden` para orden manual dentro de la zona (reparto).
- **Mora**: `diasParaMora` para alertas/estado de cuenta.
- **Edición**: `permitidoEditar`. Si es 0, solo admin puede editar datos del cliente; se pone en 0 al **confirmar una entrega** para ese cliente (bloqueo hasta nueva intervención admin).

### 2.2 Cuenta corriente (cálculo de saldo)

- **Saldo total**: suma de saldos pendientes de todos los **pedidos activos no cancelados** del cliente más el impacto de **saldos manuales** (créditos/débitos).
- **Pedidos**: se consideran pedidos con `esActivo = 1` y `idEstadoPedido <> 6` (excluye cancelados). Por cada pedido:
  - **Total pedido**: suma de subtotales de cada `DetallePedido` (ver lógica de subtotal en § 4.2).
  - **Total pagado**: suma de montos de `PagoPedido` activos de ese pedido.
  - **Saldo pendiente del pedido** = total pedido − total pagado (mínimo 0).
- **Saldos manuales** (`SaldoManualCliente`): movimientos tipo “Credito” o “Debito”. Para créditos se descuenta lo ya pagado con `PagoSaldoManual`; el saldo pendiente del crédito entra en el saldo del cliente. Los débitos se suman como deuda del cliente.
- **Días de mora**: se calculan a partir del **pedido con saldo pendiente más antiguo** (por `fechaHoraEntrega`). Días = diferencia en días (UTC) entre esa fecha y la fecha actual; mínimo 0.
- **Última visita**: `fechaHoraUltimaVisita` y cálculo de “días desde última visita” para indicadores en listado de clientes.

---

## 3. Pedidos

### 3.1 Estados de pedido (idEstadoPedido)

- **3 y 4**: Pendientes de entrega (en proceso, en ruta, etc.).
- **5**: **Entregado** – entrega confirmada.
- **6**: **Cancelado** – pedido cancelado; no se considera en cuenta corriente ni en listados de entregas pendientes.

### 3.2 Flujo del pedido

- **Creación/edición**: en admin pedido (pasos: cliente, productos, confirmación). Se asocia a cliente, zona, vendedor; se cargan ítems con producto (y derivado si aplica), cantidad, precio.
- **Pagos en confirmación**: se pueden cargar pagos (efectivo, transferencia, cheque) con monto, número de comprobante (últimos 6 dígitos) y entidad para transferencia/cheque. Los pagos se persisten al confirmar el pedido.
- **Total del pedido**: se obtiene de la vista/backend `PedidoTotalView` o equivalente, coherente con la suma de subtotales de detalles (cantidad final × precio unitario, con regla de pesables; ver § 4.2).

---

## 4. Entregas y registro de entrega

### 4.1 Cargas y listado de entregas

- Una **Carga** agrupa pedidos para una jornada de reparto. Relación **PedidoxCarga** (idPedido, idCarga, esActivo).
- **Estados de carga**: por ejemplo `idEstadoCarga = 3` = “Recibida y Entregada” cuando todos los pedidos de la carga están entregados.
- **EntregasService.getPedidosPorCarga(idCarga)**: devuelve pedidos de la carga con datos de cliente, zona, vendedor, total, saldo CC, estado de entrega. Opción `incluirEntregados`: si es `false`, se excluyen los que ya están en estado ENTREGADO.
- **Estado de entrega** (para la UI): se deriva de `idEstadoPedido`: 5 → ENTREGADO; 3 o 4 → PENDIENTE.

### 4.2 Detalle de pedido para entrega

- **EntregasService.getDetallePedidoEntrega(idPedido, idCarga)**: arma el DTO de entrega con productos (`DetallePedido` + nombre producto/derivado, cantidad pedida, precio unitario, `necesitaPesar`). Inicialmente cantidad a entregar = cantidad pedida, devolver = 0, cantidad final según reglas de negocio.
- **Productos pesables** (`necesitaPesar = 1`): la cantidad a cobrar es la **cantidad pesada** (kg). Si no se ingresó peso o es ≤ 0, el subtotal del ítem se considera 0 y no se puede confirmar la entrega hasta cargar peso.
- **Productos no pesables**: cantidad a cobrar = **máximo(0, entregar − devolver)**. Si se baja “entregar” o se sube “devolver”, el subtotal baja.
- **Regla de consistencia**: en todo momento **entregar + devolver ≥ cantidad pedida**. Si el usuario cambia “entregar”, se ajusta “devolver” y viceversa para mantener esa desigualdad.
- **Subtotal por ítem**: para pesables = cantidad pesada × precio unitario; para no pesables = (entregar − devolver) × precio unitario (con la cantidad final ya calculada).
- **Precio unitario**: solo usuarios con rol 1 o 2 pueden editarlo en la pantalla de registrar entrega; el resto solo ve el valor formateado.

### 4.3 Devoluciones (borrador)

- Las devoluciones se registran en **DevolucionEntrega** (idPedido, idCarga, idDetallePedido, idProducto, idProductoDerivado, cantidad, motivo, esActivo, etc.).
- **Borrador**: al cerrar/cancelar el diálogo de “Registrar entrega” sin confirmar, se guardan igual las devoluciones ingresadas (borrador) para recuperarlas al reabrir. Si el usuario pone todo en 0, las devoluciones existentes se desactivan (soft delete).
- Al **confirmar** la entrega, las devoluciones finales se crean/actualizan y las borrador se desactivan para no duplicar.

### 4.4 Pagos en tiempo real (registrar entrega)

- Los pagos se registran **en tiempo real** al hacer clic en “Registrar Pago”: se crea un `PagoPedido` con idPedido, método (efectivo/transferencia/cheque), monto, fecha, número de comprobante (6 dígitos), entidad si aplica.
- **Validaciones al agregar pago**: monto > 0; si es transferencia o cheque, número de comprobante y entidad obligatorios. El número se restringe a 6 dígitos.
- Al **confirmar la entrega** no se vuelven a crear pagos; solo se usan los ya persistidos. Se valida que el **total pagado** sea al menos el **total del pedido** si el cliente **no** tiene cuenta corriente; si tiene cuenta corriente puede pagar menos (queda saldo).

### 4.5 Confirmación de entrega

- **Validaciones**:
  - Al menos un producto con cantidad a entregar > 0.
  - Productos pesables con cantidad a entregar > 0 deben tener peso (cantidad pesada) > 0.
  - Al menos un pago registrado.
  - Cada pago con transferencia/cheque debe tener número de comprobante (y entidad si aplica).
  - Si el cliente no tiene cuenta corriente: total pagado ≥ total pedido.
- **Acciones al confirmar**:
  - Actualizar **DetallePedido**: `cantidadFinal`, `cantidadPesada` (si es pesable).
  - Actualizar **Pedido**: `idEstadoPedido = 5` (Entregado), `fechaHoraEntrega` (fecha/hora Argentina), `observaciones` si se enviaron.
  - Crear registros de **DevolucionEntrega** por ítems con devolución (y desactivar borradores).
  - Actualizar **Cliente**: `permitidoEditar = 0` para que solo admin pueda editar hasta que se habilite de nuevo.
  - Si la carga tiene todos sus pedidos entregados, actualizar **Carga** a `idEstadoCarga = 3` (Recibida y Entregada).

### 4.6 Cancelación de pedido (desde registrar entrega)

- Opción “Cancelar pedido”: se pide confirmación. Se crean **DevolucionEntrega** por todos los ítems del pedido (cantidad = cantidad pedida), motivo por defecto “Devolución del pedido” o el ingresado. Se actualiza **Pedido** a `idEstadoPedido = 6` (Cancelado) y **DetallePedido** con `cantidadFinal = 0`, `cantidadPesada = null`. Se verifica y actualiza estado de la carga si corresponde.

---

## 5. Pagos (PagoPedido)

### 5.1 Métodos de pago

- **efectivo**: solo monto.
- **transferencia**: monto + **número de transferencia** (últimos 6 dígitos) + **entidad/banco**.
- **cheque**: monto + **número de cheque** (últimos 6 dígitos) + **entidad/banco**.

En toda la app, los campos de número de comprobante (transferencia/cheque) comparten la misma regla: solo dígitos, máximo 6; placeholder “Ingrese últimos 6 dígitos” y hint “Solo 6 dígitos”.

### 5.2 Validación y rendición

- **validado**: 1 = acreditado/validado (para transferencias/cheques); 0 = pendiente. Se usa en flujos de “Validar transferencias y cheques” y en rendiciones.
- Los pagos se asocian a un **idPedido** y se usan para calcular total pagado del pedido y saldo en cuenta corriente.

---

## 6. Cuenta corriente (pantalla y movimientos)

### 6.1 Ítems de cuenta corriente

- Se arma una lista unificada: **pedidos** (con saldo pendiente y pagos) + **saldos manuales** (créditos/débitos) + **pagos a saldos manuales**. Cada ítem tiene tipo, identificador, fecha, concepto, monto total, monto pagado, saldo pendiente.
- **Cargar deuda**: creación de `SaldoManualCliente` tipo “Debito” (a favor del cliente). Opcionalmente con vencimiento y concepto.
- **Pago a cuenta**: se puede pagar con efectivo, transferencia o cheque (mismo criterio de 6 dígitos y entidad). El pago se aplica a ítems seleccionados o a “saldo manual” según el flujo (PagoSaldoManual o aplicación a pedidos según implementación).

### 6.2 Cálculo de subtotal de detalle (pedido/cuenta)

- **Pesables**: subtotal = `cantidadPesada` × `precio_unitario` (si no hay peso válido, 0).
- **No pesables**: subtotal = `cantidadFinal` (o `cantidad` si no hay cantidadFinal) × `precio_unitario`.
- Esta misma lógica se usa en `ClienteDataService` para totales por pedido y en pantallas de cuenta corriente y entregas.

---

## 7. Rendiciones

### 7.1 Concepto

- El repartidor/vendedor “rinde” los cobros (efectivo, transferencias, cheques) ante el sistema. Una **Rendicion** agrupa varios pagos rendidos; cada uno se registra en **RendicionPago** (idRendicion, idPagoPedido, monto, metodoPago, numComprobante, entidad, etc.).

### 7.2 Pagos pendientes de rendir

- **RendicionDataService.getPagosYCargasPendientes(periodo?)**: pagos (`PagoPedido`) creados por el usuario logueado (`idUsuarioAlta`), activos, que aún tienen saldo por rendir (monto del pago − suma de montos ya rendidos en `RendicionPago` activos). Opcionalmente filtrados por rango de fechas. Incluye datos de pedido, cliente, carga y vendedor para mostrar en UI.

### 7.3 Nueva rendición

- El usuario selecciona qué pagos incluir (efectivo, transferencias, cheques), puede agregar “transferencia manual” (monto + número 6 dígitos + banco). Al guardar se crea la **Rendicion** y los **RendicionPago** correspondientes. Transferencias y cheques pueden tener estado “validado” (validado externamente).

### 7.4 Validación de transferencias y cheques

- Flujo para marcar pagos (transferencia/cheque) como “validados” (acreditados), actualizando el campo correspondiente en `PagoPedido` y fecha/usuario de validación.

---

## 8. Distribución y rutas

### 8.1 Cargas

- **Carga**: idEncargado, idEstadoCarga, zonas (vía CargaxZona). Estados incluyen “Recibida y Entregada” (3) cuando todos los pedidos de la carga están entregados.
- **Configurar carga**: asignación de zonas y pedidos a la carga (PedidoxCarga).

### 8.2 Orden de entrega (ruta)

- **EntregasService.calcularRutaOptimizada(pedidos, puntoInicio)**: si todos los pedidos tienen `ordenEntrega` definido, se ordena por ese campo. Si no, se aplica **vecino más cercano** (Haversine) sobre pedidos con lat/long válidos; los que no tienen ubicación van al final. El punto de inicio es { lat, lng }.
- Las distancias se calculan con **Haversine** (radio Tierra 6371 km).

---

## 9. Productos y listas de precios

- **Producto**: nombre, marca, categoría, subcategoría, necesita pesar, precio en lista, etc. Derivados (`ProductoDerivado`) para variantes.
- **Listas de precios**: listas por nombre; **ProductoListaPrecio** y **ZonaListaPrecio** definen precios por lista y zona. El cliente puede tener `usaPrecioCosto` para usar precio costo en alguna lista.
- **Stock**: movimientos de stock y actualización según entregas/devoluciones (lógica referida en comentarios/TODO donde aplique).
- **Stock en pedidos**: El stock disponible al armar un pedido se obtiene de **ProductoStock** y **ProductoDerivadoStock** (suma de `cantidad` de lotes activos). Al agregar ítems al pedido se descuenta de esos lotes (prioridad: sin fecha de vencimiento o los más antiguos). La tabla **DetallePedidoLote** vincula cada DetallePedido con los lotes de los que se descontó; al bajar cantidad o eliminar un ítem se restaura el stock en esos lotes.

---

## 10. Finanzas adicionales

- **Compromisos con proveedores**: registro de compromisos (monto, proveedor, etc.) para seguimiento.
- **Pagos al personal / adelantos**: flujos específicos de pagos a empleados y solicitud de adelantos con montos y validaciones propias.
- **Cuentas corrientes (finanzas)**: pago a cuenta corriente desde el módulo finanzas con los mismos criterios de método de pago y 6 dígitos para comprobantes.

---

## 11. Resumen de validaciones críticas

| Contexto | Regla |
|----------|--------|
| Agregar pago (cualquier pantalla) | monto > 0; transferencia/cheque → número (6 dígitos) y entidad obligatorios |
| Confirmar entrega | Al menos un ítem con entregar > 0; pesables con entregar > 0 deben tener peso; al menos un pago; sin CC → total pagado ≥ total pedido |
| Cuenta corriente (saldo) | Excluir pedidos cancelados (idEstadoPedido = 6); subtotal por detalle según pesable/no pesable |
| Número comprobante | Solo dígitos, máximo 6 caracteres en todos los formularios de pago |
| Precio unitario en entrega | Solo rol 1 o 2 pueden editarlo |

---

**Última actualización:** Febrero 2026
