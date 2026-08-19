import mongoose, { Schema, model } from 'mongoose';
import { IBrand } from '../interfaces/brand.interface.js';


const brandModel = mongoose.models.brand || model('brand', brandSchema);

export default brandModel;
