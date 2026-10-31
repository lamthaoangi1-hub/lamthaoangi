import { startPortal } from './panel.js?v=20261031a';
import { panel as admin } from './admin.js?v=20261031b';
import { panel as seller } from './seller.js?v=20261031a';
import { panel as shipper } from './shipper.js?v=20261031a';

startPortal([admin, seller, shipper]);
