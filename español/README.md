# Agente Eth para Comerciantes de LATAM

Un agente de IA sofisticado diseñado para ayudar a los comerciantes en América Latina a gestionar sus negocios a través de tecnología blockchain, protocolos DeFi y gestión segura de datos.

## Características

### Características Actuales
- Agente de IA interactivo impulsado por GPT-4
- Interacción blockchain a través de Coinbase Developer Platform (CDP)
- Gestión de billeteras y operaciones con criptomonedas
- Operación multi-modo (chat y autónomo)

### Próximas Características
- **Integración con Telegram**
  - Interfaz principal para comerciantes
  - Consola de depuración para desarrolladores
  - Sistema completo de registro para auditorías
  - Entorno de pruebas

- **Gestión Segura de Datos (Nillion)**
  - Almacenamiento encriptado de perfiles de tienda
  - Sistema de bóveda segura para:
    - Información del propietario
    - Detalles de la tienda
    - Datos de ubicación
    - Credenciales del negocio

- **Sistema de Inventario y Ventas (NilQL & NilDB)**
  - Registro y gestión de productos
  - Seguimiento de stock en tiempo real
  - Registro y análisis de ventas
  - Optimización de consultas para grandes conjuntos de datos

- **Integración DeFi**
  - Integración del stablecoin Peso Mexicano $XOC
  - Servicios de préstamo del Protocolo Aave
  - Optimización de rendimiento
  - Herramientas de gestión de riesgos

## Requisitos Previos

- Node.js (v16 o superior)
- npm o yarn
- Clave API de OpenAI
- Credenciales de Coinbase Developer Platform

## Variables de Entorno

Crea un archivo `.env` con:

```
OPENAI_API_KEY=tu_clave_aquí
CDP_API_KEY_NAME=tu_nombre_clave_cdp
CDP_API_KEY_PRIVATE_KEY=tu_clave_privada
NETWORK_ID=base-sepolia  # Opcional, por defecto base-sepolia
```

## Instalación

```
# Clonar el repositorio
git clone [url-repositorio]

# Instalar dependencias
npm install

# Construir el proyecto
npm run build
```

## Uso

```
# Modo desarrollo
npm run dev

# Modo producción
npm start

# Linting
npm run lint

# Corregir problemas de linting
npm run lint:fix

# Formatear código
npm run format
```

## Estructura del Proyecto

```
├── chatbot.ts          # Lógica principal del agente
├── español/            # Documentación en español
├── src/               # Código fuente
│   ├── telegram/      # Integración de Telegram
│   ├── nillion/       # Integración de Nillion
│   └── defi/          # Integraciones DeFi
├── dist/              # Código compilado
└── tests/             # Archivos de prueba
```

## Contribuir

1. Haz un fork del repositorio
2. Crea tu rama de características (`git checkout -b feature/CaracterísticaIncreíble`)
3. Haz commit de tus cambios (`git commit -m 'Añadir alguna CaracterísticaIncreíble'`)
4. Haz push a la rama (`git push origin feature/CaracterísticaIncreíble`)
5. Abre un Pull Request

## Licencia

Apache-2.0 - consulta el archivo [LICENSE](LICENSE) para más detalles
