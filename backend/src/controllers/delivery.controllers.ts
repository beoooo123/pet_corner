// controllers/deliveryController.ts
import { Request, Response } from 'express';
import deliveryModel from '../models/delivery.model.js';

// Get all deliveries
export const getAllDeliveries = async (req: Request, res: Response): Promise<void> => {
  try {
    const deliveries = await deliveryModel.find();
    res.status(200).json({
      success: true,
      count: deliveries.length,
      data: deliveries
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching deliveries',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get delivery by ID
export const getDeliveryById = async (req: Request, res: Response): Promise<void> => {
  try {
    const delivery = await deliveryModel.findById(req.params.id);

    if (!delivery) {
      res.status(404).json({
        success: false,
        message: 'Delivery not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: delivery
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching delivery',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Create new delivery
export const insertDelivery = async (req: Request, res: Response): Promise<void> => {
  try {
    const { delivery_name, description, delivery_fee, estimated_delivery_time, status } = req.body;

    // Validate required fields
    if (!delivery_name || !delivery_fee || !estimated_delivery_time) {
      res.status(400).json({
        success: false,
        message: 'Delivery name, delivery fee, and estimated delivery time are required'
      });
      return;
    }

    const delivery = new deliveryModel({
      delivery_name,
      description,
      delivery_fee,
      estimated_delivery_time,
      status
    });

    const savedDelivery = await delivery.save();

    res.status(201).json({
      success: true,
      data: savedDelivery,
      message: 'Delivery created successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error creating delivery',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Update delivery
export const updateDelivery = async (req: Request, res: Response): Promise<void> => {
  try {
    const delivery = await deliveryModel.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!delivery) {
      res.status(404).json({
        success: false,
        message: 'Delivery not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: delivery,
      message: 'Delivery updated successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error updating delivery',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Delete delivery
export const deleteDelivery = async (req: Request, res: Response): Promise<void> => {
  try {
    const delivery = await deliveryModel.findByIdAndDelete(req.params.id);

    if (!delivery) {
      res.status(404).json({
        success: false,
        message: 'Delivery not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Delivery deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting delivery',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
