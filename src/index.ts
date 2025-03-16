import express,{Request,Response} from 'express'; 
import morgan from 'morgan'; 
import { SuccessResponse } from './types/types/types';
import getHealthReport from './config/serverHealth';
import cors from 'cors';


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