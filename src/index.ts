import express,{Request,Response} from 'express'; 
import morgan from 'morgan'; 
import { SuccessResponse } from './types/types/types';
import getHealthReport from './config/serverHealth';
import cors from 'cors';
import connectDatabase from './config/database';
import cloudRoutes from "./routes/cloudinary.routes"; 
import cookieParser from 'cookie-parser';
import userRoutes from './routes/user.routes';
import productRoutes from "./routes/product.routes";
import adminRoutes from './routes/admin.routes';
import commonRoutes from './routes/common.routes';
import orderRoutes from './routes/order.routes';
import admin from "firebase-admin"; 
import cartRoutes from "./routes/cart.routes";
import couponRoutes from "./routes/coupon.routes"; 
import inventoryRoutes from "./routes/inventory.routes";
const serviceAccount = require(__dirname + "/service_account.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://cartveg-c339b.firebaseio.com" // Correct Firebase URL
}); 

const app = express();
const PORT = process.env.PORT || 3000;
app.use(morgan('dev'));
app.use(express.json());
app.use(cors(
    {
        origin : '*',
        methods : ['GET', 'POST', 'PUT', 'DELETE']
    }
));
app.use(cookieParser());
app.use('/cloud', cloudRoutes);
app.use('/user', userRoutes);
app.use('/product', productRoutes);
app.use('/admin', adminRoutes);
app.use('/common', commonRoutes);
app.use('/order', orderRoutes);
app.use('/cart', cartRoutes);
app.use('/coupon', couponRoutes);
app.use("/inventory", inventoryRoutes);

(async()=>{
    try {
        await connectDatabase(); 
      
    }catch(error: any){
        console.log(`Error: ${error.message}`);
        process.exit(1);
    }
})(); 

app.get('/', (req:Request, res:Response) => {
    const response : SuccessResponse = {
        statusCode : 200, 
        message : 'Hello from the CartVeg API'
    }
    res.send(response);
    return; 
}); 
app.get('/api-health', (req, res) => {
    const healthReport = getHealthReport(); 
    const response : SuccessResponse = {
        statusCode : 200, 
        message : 'Server is healthy',
        data : healthReport
    }; 
    res.send(response);
});


app.listen(PORT, () => {
    console.log(`Server is running on port http://localhost:${PORT}`);
});