import {Router} from 'express';
import amenityPriceRouter from './amenity-price.routes';
import amenityQuotaRouter from './amenity-quota.routes';
import amenityRouter from './amenity.routes';
import authRouter from './auth.routes';
import cityRouter from './city.routes';
import employeeRouter from './employee.routes';
import guestRouter from './guest.routes';
import pricingRuleRouter from './pricing-rule.routes';
import pricingRouter from './pricing.routes';
import provinceRouter from './province.routes';
import reservationAmenityRouter from './reservation-amenity.routes';
import reservationRouter from './reservation.routes';
import roomCategoryRouter from './room-category.routes';
import roomRouter from './room.routes';
import userRouter from './user.routes';

const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/rooms', roomRouter);
apiRouter.use('/room-categories', roomCategoryRouter);
apiRouter.use('/guests', guestRouter);
apiRouter.use('/reservations', reservationRouter);
apiRouter.use('/amenities', amenityRouter);
apiRouter.use('/amenity-quotas', amenityQuotaRouter);
apiRouter.use('/amenity-prices', amenityPriceRouter);
apiRouter.use('/reservation-amenities', reservationAmenityRouter);
apiRouter.use('/pricing', pricingRouter);
apiRouter.use('/pricing-rules', pricingRuleRouter);
apiRouter.use('/provinces', provinceRouter);
apiRouter.use('/cities', cityRouter);
apiRouter.use('/employees', employeeRouter);
apiRouter.use('/users', userRouter);

export default apiRouter;
