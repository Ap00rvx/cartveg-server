"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const morgan_1 = __importDefault(require("morgan"));
const serverHealth_1 = __importDefault(require("./config/serverHealth"));
const cors_1 = __importDefault(require("cors"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
app.use((0, morgan_1.default)('dev'));
app.use(express_1.default.json());
app.use((0, cors_1.default)({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
}));
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
