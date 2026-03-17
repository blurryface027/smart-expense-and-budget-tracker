module.exports=[950524,a=>{"use strict";var b=a.i(137936),c=a.i(118558),d=a.i(616349),e=a.i(53112);let f=e.z.object({title:e.z.string().min(1,"Title is required"),targetAmount:e.z.number({message:"Target amount is required"}).positive("Target must be greater than 0"),deadline:e.z.date().optional().nullable()});async function g(a){let b=await (0,d.createClient)(),e=f.safeParse(a);if(!e.success)return{error:"Invalid form data"};let{data:{user:g}}=await b.auth.getUser();if(!g)return{error:"Not authenticated"};let{error:h}=await b.from("goals").insert({user_id:g.id,title:e.data.title,target_amount:e.data.targetAmount,deadline:e.data.deadline?e.data.deadline.toISOString():null});return h?{error:h.message}:((0,c.revalidatePath)("/goals"),{success:!0})}async function h(){let a=await (0,d.createClient)(),{data:b,error:c}=await a.from("goals").select(`
      id,
      title,
      target_amount,
      current_amount,
      deadline,
      created_at
    `).order("created_at",{ascending:!1});return c?{error:c.message,data:null}:{data:b,error:null}}(0,a.i(713095).ensureServerEntryExports)([g,h]),(0,b.registerServerReference)(g,"408e9d3c93c0f7b53ea03a7700f43132b3b1e4bf18",null),(0,b.registerServerReference)(h,"00ce050317bee570641c3b99c2454e2a383b365be3",null),a.s(["addGoal",()=>g,"getGoals",()=>h],950524)},995908,a=>{"use strict";var b=a.i(330283),c=a.i(950524);a.s([],345913),a.i(345913),a.s(["00ce050317bee570641c3b99c2454e2a383b365be3",()=>c.getGoals,"00f39037fb233a8d239b1c92494c6926538cacc8f9",()=>b.signout,"408e9d3c93c0f7b53ea03a7700f43132b3b1e4bf18",()=>c.addGoal,"40a0c3f4add0723f1ee73a98e96713707b5ba0c50f",()=>b.signup,"40ce0392a00859b2f8da9518f0bf6f23872b3b5c02",()=>b.login],995908)}];

//# sourceMappingURL=_43c798e5._.js.map