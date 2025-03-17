import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();
const connectDatabase = async()=>{ 
    try {
        await mongoose.connect(process.env.DATABASE_URL!); 
        console.log("Database connected successfully");
    }catch(error: any){
        console.log(`Error: ${error.message}`);
        process.exit(1);
    }

}

export default connectDatabase;