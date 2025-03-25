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