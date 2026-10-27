import { startPortal } from './panel.js?v=20261024a';
import { panel as admin } from './admin.js?v=20261023a';
import { panel as seller } from './seller.js?v=20261027a';
import { panel as shipper } from './shipper.js?v=20261027a';

startPortal([admin, seller, shipper]);
