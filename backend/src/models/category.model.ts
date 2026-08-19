import mongoose, { Schema, model } from 'mongoose';
import { ICategory } from '../interfaces/category.interface.js';
import { CategoryStatus } from '../enums/category.enum.js';


const categoryModel = mongoose.models.category || model('category', categorySchema);

export default categoryModel;
