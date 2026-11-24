ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
UPDATE public.shops SET is_demo = true WHERE id IN ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','33333333-3333-3333-3333-333333333333');
INSERT INTO public.products (shop_id,name,category,unit,price_syp,price_usd,stock,visible) VALUES
('11111111-1111-1111-1111-111111111111','صابون','منظفات','قطعة',5000,0.38,30,true),
('22222222-2222-2222-2222-222222222222','صابون','منظفات','قطعة',4500,0.35,20,true),
('33333333-3333-3333-3333-333333333333','مسحوق غسيل','منظفات','كيس',25000,1.9,15,true),
('22222222-2222-2222-2222-222222222222','مسحوق غسيل','منظفات','كيس',27000,2.05,10,true);