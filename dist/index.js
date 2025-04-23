"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const morgan_1 = __importDefault(require("morgan"));
const serverHealth_1 = __importDefault(require("./config/serverHealth"));
const cors_1 = __importDefault(require("cors"));
const database_1 = __importDefault(require("./config/database"));
const cloudinary_routes_1 = __importDefault(require("./routes/cloudinary.routes"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const product_routes_1 = __importDefault(require("./routes/product.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const common_routes_1 = __importDefault(require("./routes/common.routes"));
const order_routes_1 = __importDefault(require("./routes/order.routes"));
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const cart_routes_1 = __importDefault(require("./routes/cart.routes"));
const coupon_routes_1 = __importDefault(require("./routes/coupon.routes"));
const inventory_routes_1 = __importDefault(require("./routes/inventory.routes"));
const category_routes_1 = __importDefault(require("./routes/category.routes"));
const report_routes_1 = __importDefault(require("./routes/report.routes"));
const serviceAccount = require(__dirname + "/service_account.json");
firebase_admin_1.default.initializeApp({
    credential: firebase_admin_1.default.credential.cert(serviceAccount),
    databaseURL: "https://cartveg-c339b.firebaseio.com" // Correct Firebase URL
});
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
app.use((0, morgan_1.default)('dev'));
app.use(express_1.default.json());
app.use((0, cors_1.default)({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
}));
app.use((0, cookie_parser_1.default)());
app.use('/cloud', cloudinary_routes_1.default);
app.use('/user', user_routes_1.default);
app.use('/product', product_routes_1.default);
app.use('/admin', admin_routes_1.default);
app.use('/common', common_routes_1.default);
app.use('/order', order_routes_1.default);
app.use('/cart', cart_routes_1.default);
app.use('/coupon', coupon_routes_1.default);
app.use("/inventory", inventory_routes_1.default);
app.use('/category', category_routes_1.default);
app.use('/report', report_routes_1.default);
(() => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield (0, database_1.default)();
    }
    catch (error) {
        console.log(`Error: ${error.message}`);
        process.exit(1);
    }
}))();
app.get('/', (req, res) => {
    const response = {
        statusCode: 200,
        message: 'Hello from the CartVeg API'
    };
    res.send(response);
    return;
});
app.get('/api-health', (req, res) => {
    const healthReport = (0, serverHealth_1.default)();
    const response = {
        statusCode: 200,
        message: 'Server is healthy',
        data: healthReport
    };
    res.send(response);
});
app.listen(PORT, () => {
    console.log(`Server is running on port http://localhost:${PORT}`);
});
