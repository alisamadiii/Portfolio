// import { z } from "zod";
// import { useRef } from "react";

// import { useUpdateProduct } from "@/hooks/use-payments";
// import { Button } from "@/components/ui/button";
// import {
//   Dialog,
//   DialogTitle,
//   DialogHeader,
//   DialogContent,
//   DialogTrigger,
//   DialogBody,
//   DialogFooter,
//   DialogError,
//   DialogClose,
// } from "@/components/ui/dialog";
// import { ReusableForm } from "@/components/custom/reusable-form";
// import { useForm } from "@/hooks/use-form";
// import type { InsertProduct, Product } from "@/db/schema";
// import { LoadingButton } from "@/components/custom/loading-button";
// import { closeDialog } from "@/lib/utils";

// const formSchema = z.object({
//   name: z.string().min(1),
//   price: z.coerce.number().min(0), // Changed from string to number to match schema
//   productId: z.string().min(1),
//   sort: z.coerce.number().min(1).optional(),
//   description: z.string().optional(),
//   interval: z.enum(["month", "year"]),
//   thumbnail: z.string().optional(),
//   popular: z.boolean().optional(),
//   slug: z.string().min(1),
// }) ;

// interface UpdatePaymentDialogProps {
//   children: React.ReactNode;
//   product: Product;
// }

// export const UpdatePaymentDialog = ({
//   children,
//   product,
// }: UpdatePaymentDialogProps) => {
//   const formRef = useRef<HTMLFormElement>(null);
//   const form = useForm(formSchema, {
//     name: product.name,
//     price: product.price,
//     productId: product.productId,
//     sort: product.sort ?? 1,
//     description: product.description ?? "",
//     interval: product.interval,
//     thumbnail: product.thumbnail ?? "",
//     popular: product.popular ?? false,
//     slug: product.slug,
//   });

//   const updateProduct = useUpdateProduct();

//   return (
//     <Dialog>
//       {children && <DialogTrigger asChild>{children}</DialogTrigger>}
//       <DialogContent
//         onReset={() => {
//           form.reset();
//         }}
//       >
//         <DialogHeader>
//           <DialogTitle>Update Plan</DialogTitle>
//         </DialogHeader>
//         <DialogBody>
//           <ReusableForm
//             formRef={formRef}
//             form={form}
//             inputs={[
//               {
//                 label: "Name",
//                 name: "name",
//                 type: "text",
//                 placeholder: "Plan Name",
//               },
//               {
//                 label: "Description",
//                 name: "description",
//                 type: "text",
//                 placeholder: "Plan Description",
//               },
//               {
//                 label: "Price",
//                 name: "price",
//                 type: "number",
//                 placeholder: "Price in cents",
//               },
//               {
//                 label: "Product ID",
//                 name: "productId",
//                 type: "text",
//                 placeholder: "XXXX",
//               },
//               {
//                 label: "Interval",
//                 name: "interval",
//                 type: "select",
//                 placeholder: "Interval",
//                 options: [
//                   { label: "Month", value: "month" },
//                   { label: "Year", value: "year" },
//                 ],
//               },
//               {
//                 label: "Slug",
//                 name: "slug",
//                 type: "text",
//                 placeholder: "/slug/...",
//               },
//               {
//                 label: "Sort Order",
//                 name: "sort",
//                 type: "number",
//                 placeholder: "Sort Order",
//               },
//               {
//                 label: "Thumbnail URL",
//                 name: "thumbnail",
//                 type: "text",
//                 placeholder: "Thumbnail URL",
//               },
//               {
//                 label: "Popular",
//                 name: "popular",
//                 type: "checkbox",
//               },
//             ]}
//             onSubmit={(event) => {
//               updateProduct.mutate(
//                 {
//                   id: product.id,
//                   product: event,
//                 },
//                 {
//                   onSuccess: () => {
//                     closeDialog();
//                     // Closing DropdownMenu
//                     setTimeout(() => {
//                       closeDialog();
//                     }, 300);
//                   },
//                 }
//               );
//             }}
//           />
//         </DialogBody>
//         <DialogFooter>
//           <DialogClose>
//             <Button variant="destructive">Cancel</Button>
//           </DialogClose>
//           <LoadingButton
//             type="submit"
//             onClick={() => {
//               formRef.current?.requestSubmit();
//             }}
//             isLoading={updateProduct.isPending}
//           >
//             Update Plan
//           </LoadingButton>
//         </DialogFooter>
//         <DialogError isError={updateProduct.isError}>
//           {updateProduct.error?.message}
//         </DialogError>
//       </DialogContent>
//     </Dialog>
//   );
// };
