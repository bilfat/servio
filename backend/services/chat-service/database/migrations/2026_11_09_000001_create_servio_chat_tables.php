<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Conversations Table
        Schema::create('conversations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('type')->default('direct'); // direct | group
            $table->uuid('last_message_id')->nullable();
            $table->timestamp('last_message_at')->nullable();
            $table->timestamps();
        });

        // 2. Conversation Participants Table
        Schema::create('conversation_participants', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('conversation_id');
            $table->string('user_id', 64);
            $table->string('entity_type', 32); // customer | merchant | worker | provider | support
            $table->string('entity_id', 64);   // store_id | worker_id | user_id | provider_id
            $table->string('display_name', 150);
            $table->string('avatar_url', 500)->nullable();
            $table->integer('unread_count')->default(0);
            $table->timestamp('last_read_at')->nullable();
            $table->boolean('is_pinned')->default(false);
            $table->timestamps();

            $table->index(['conversation_id', 'user_id']);
            $table->index(['user_id', 'entity_type']);
            $table->index('entity_id');
        });

        // 3. Messages Table
        Schema::create('messages', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('conversation_id');
            $table->string('sender_id', 64);
            $table->string('sender_entity_type', 32);
            $table->string('client_msg_id', 100)->nullable();
            $table->string('type', 32)->default('text'); // text | image | context_catalog | context_order | context_warranty
            $table->text('body')->nullable();
            $table->string('media_url', 500)->nullable();
            $table->json('context_metadata')->nullable();
            $table->string('status', 20)->default('sent'); // pending | sent | delivered | read
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->index(['conversation_id', 'created_at']);
            $table->index('client_msg_id');
        });

        // 4. User Presence Table
        Schema::create('user_presences', function (Blueprint $table) {
            $table->string('user_id', 64)->primary();
            $table->boolean('is_online')->default(false);
            $table->uuid('active_conversation_id')->nullable();
            $table->timestamp('last_seen_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_presences');
        Schema::dropIfExists('messages');
        Schema::dropIfExists('conversation_participants');
        Schema::dropIfExists('conversations');
    }
};
