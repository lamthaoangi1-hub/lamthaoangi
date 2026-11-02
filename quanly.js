import { startPortal } from './panel.js?v=20261102b';
import { panel as admin } from './admin.js?v=20261102b';
import { panel as seller } from './seller.js?v=20261102b';
import { panel as shipper } from './shipper.js?v=20261102b';

startPortal([admin, seller, shipper]);
