import { startPortal } from './panel.js?v=20261022c';
import { panel as admin } from './admin.js?v=20261022c';
import { panel as seller } from './seller.js?v=20261022c';
import { panel as shipper } from './shipper.js?v=20261022c';

startPortal([admin, seller, shipper]);
