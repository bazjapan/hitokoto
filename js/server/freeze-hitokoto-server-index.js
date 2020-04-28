module.exports = function (server, opts) {
	
	console.log("%chitokoto", server.utils.mk_trace_css("blue", "yellow"));
	const service_name = opts.service_name || "hitokoto";
	const hitokoto = {
		collections: {}
	};

	hitokoto.collections.comments = server.datastore_manager.add_collection({
		type: "mongo",
		name: "comments",
		label: "item",
		mlabel: "items",
		store_name: "mdb_hitokoto",
		setup: function () {},
		_default: {}
	});

	hitokoto.service = server.service_manager.expose_as_service({
		name: service_name,
		methods: {},
		managed: true
	});

	hitokoto.service.crudify_collection(hitokoto.collections.comments, {
		use_key: 1
	});

	hitokoto.service.methods.get_items = {
		expects: ["key", "obj_id", "obj_type"],
		on_ldr: function (ctx, ldr, result) {
			ldr.dsn = "comments";
			return ldr;
		},
		run: function (ctx, next) {
			let q = ctx.req.query = ctx.req.query || {};
			q.key = ctx.req.key;
			q.obj_id = ctx.req.obj_id;
			q.obj_type = ctx.req.obj_type;
			return hitokoto.service.queries.get_items(ctx, next);
		}
	}

	hitokoto.service.mutations.remove_by_obj_id = function (ctx, next) {
		let q = {
			key: ctx.req.key,
			obj_id: ctx.req.obj_id,
			obj_type: ctx.req.obj_type
		}
		return hitokoto.collections.comments.remove(q, function (err, res) {
			if (err) {
				return next(err);
			}
			let mres = hitokoto.service.create_mres(ctx.req.m, "removed", null, q, null, "comments");
			ctx.message = "comments removed";
			hitokoto.service.did_mutate(ctx, mres);
			return next(err, mres);
		});

	}
	hitokoto.service.methods.remove_by_obj_id = {
		expects: ["obj_id", "obj_type", "key"],
		run: function (ctx, next) {
			return hitokoto.service.mutations.remove_by_obj_id(ctx, next);
		}
	}
	hitokoto.service.mutations.remove_item = function (ctx, next) {
		return hitokoto.collections.comments.removeById(ctx.req._id, function (err, res) {
			if (err) {
				return next(err);
			}
			let mres = hitokoto.service.create_mres(ctx.req.m, "removed", null, {
				_id: ctx.req._id,
				key: ctx.req.key,
				obj_id: ctx.req.obj_id,
				obj_type: ctx.req.obj_type
			}, null, "comments");
			ctx.message = "item removed";
			hitokoto.service.did_mutate(ctx, mres);
			return next(err, mres);
		});
	}
	hitokoto.service.methods.remove_item = {
		expects: ["_id", "obj_id", "obj_type", "key"],
		run: function (ctx, next) {
			return hitokoto.service.mutations.remove_item(ctx, next);
		}
	}


	return hitokoto;

}