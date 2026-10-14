import { startPortal } from './panel.js?v=20261014h';
import { panel as admin } from './admin.js?v=20261014h';
import { panel as seller } from './seller.js?v=20261014h';
import { panel as shipper } from './shipper.js?v=20261014h';

startPortal([admin, seller, shipper]);
